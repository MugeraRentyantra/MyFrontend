import { ACTIVE_ENROLLMENT_STATUSES, PAYMENT_STATUS, SUBMISSION_RULES } from '@/shared/constants';
import { formatBytes, isGithubUrl } from '@/shared/utils/helpers';
import { db } from '../db';
import {
  createSubmission,
  latestPaymentFor,
  listProgressForEnrollment,
  progressDto,
  startTask,
  storeUploadedFile,
  submissionDto,
} from '../services';
import {
  apiError,
  conflict,
  created,
  forbidden,
  json,
  mock,
  notFound,
  paginate,
  requireAuth,
  validationError,
} from '../utils';

/**
 * Student task endpoints (MM11, MM12; tickets GP5, GP6, GP8, GP9) — docs/API_CONTRACT.md "Learning".
 * Task URLs use the TaskProgress id. Access: the enrollment owner, or a JOINED member of the team
 * whose shared progress it is. Paid content needs an active enrollment whose latest payment
 * succeeded (403 ENROLLMENT_NOT_ACTIVE otherwise).
 */

const STUDENT = ['STUDENT'];
const SUBMITTABLE = ['IN_PROGRESS', 'CHANGES_REQUESTED'];

// ---------------------------------------------------------------------------
// Lookups and access helpers
// ---------------------------------------------------------------------------

const findEnrollment = (id) => db.enrollments.find((item) => item._id === id);
const findProgress = (id) => db.taskProgress.find((item) => item._id === id);
const findTaskDefinition = (id) => db.taskDefinitions.find((item) => item._id === id);
const findTeam = (id) => db.teams.find((item) => item._id === id);

function isJoinedMember(teamId, userId) {
  if (!teamId || !userId) return false;
  return db.teamMembers.some(
    (member) => member.teamId === teamId && member.userId === userId && member.status === 'JOINED',
  );
}

function canAccessEnrollment(user, enrollment) {
  if (!user || !enrollment) return false;
  if (enrollment.userId === user._id) return true;
  return isJoinedMember(enrollment.teamId, user._id);
}

/** Paid content needs an active enrollment status AND a successful latest payment. */
function isEnrollmentUnlocked(enrollment) {
  if (!enrollment || !ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status)) return false;
  return latestPaymentFor(enrollment._id)?.status === PAYMENT_STATUS.SUCCESS;
}

function enrollmentNotActive() {
  return forbidden(
    'Your enrollment is not active yet. Complete your payment to unlock your tasks.',
    'ENROLLMENT_NOT_ACTIVE',
  );
}

/** The enrollment through which `user` reaches `progress` (their own one for team tasks). */
function resolveEnrollment(user, progress) {
  if (progress.teamId) {
    const own = db.enrollments.find(
      (item) => item.teamId === progress.teamId && item.userId === user._id,
    );
    if (own) return own;
  }
  return findEnrollment(progress.enrollmentId) ?? null;
}

/** Owner of the progress' enrollment, or a JOINED member of the team that shares it. */
function canAccessProgress(user, progress) {
  if (progress.teamId && isJoinedMember(progress.teamId, user._id)) return true;
  const enrollment = findEnrollment(progress.enrollmentId);
  return Boolean(enrollment && enrollment.userId === user._id);
}

/**
 * Shared guard for /tasks/:id/*: auth, 404, ownership 403 and the active-enrollment 403.
 * Returns { user, progress, enrollment } or { error }.
 */
function loadProgress(request, params) {
  const auth = requireAuth(request, STUDENT);
  if (auth.error) return { error: auth.error };
  const { user } = auth;
  const progress = findProgress(params.id);
  if (!progress) return { error: notFound('Task') };
  if (!canAccessProgress(user, progress)) {
    return { error: forbidden("You don't have access to this task.") };
  }
  const enrollment = resolveEnrollment(user, progress);
  if (!isEnrollmentUnlocked(enrollment)) return { error: enrollmentNotActive() };
  return { user, progress, enrollment };
}

function bySequence(a, b) {
  return (Number(a?.task?.sequence) || 0) - (Number(b?.task?.sequence) || 0);
}

function time(value) {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ---------------------------------------------------------------------------
// Submission validation (field-level details, like the real API)
// ---------------------------------------------------------------------------

function isFileLike(value) {
  return Boolean(value) && typeof value === 'object' && typeof value.size === 'number';
}

function fileProblem(file, index) {
  const name = file.name ? `"${file.name}"` : `Screenshot ${index + 1}`;
  const extension = (/\.[^.]+$/.exec(String(file.name || '').toLowerCase()) || [''])[0];
  const typeOk = file.type
    ? SUBMISSION_RULES.allowedImageTypes.includes(file.type)
    : SUBMISSION_RULES.allowedImageExtensions.includes(extension);
  if (!typeOk) return `${name} must be a PNG, JPG or WebP image.`;
  if (!file.size) return `${name} is empty.`;
  if (file.size > SUBMISSION_RULES.maxFileSizeBytes) {
    return `${name} is larger than ${formatBytes(SUBMISSION_RULES.maxFileSizeBytes)}.`;
  }
  return null;
}

function validateSubmission({ files, description, githubUrl }) {
  const details = [];
  if (files.length < SUBMISSION_RULES.minScreenshots) {
    details.push({ field: 'screenshots', message: 'Add at least one screenshot of your work.' });
  } else if (files.length > SUBMISSION_RULES.maxScreenshots) {
    details.push({
      field: 'screenshots',
      message: `You can attach up to ${SUBMISSION_RULES.maxScreenshots} screenshots.`,
    });
  } else {
    files.forEach((file, index) => {
      const problem = fileProblem(file, index);
      if (problem) details.push({ field: 'screenshots', message: problem });
    });
  }

  const text = description.trim();
  if (text.length < SUBMISSION_RULES.minDescriptionLength) {
    details.push({
      field: 'description',
      message: `Describe your work in at least ${SUBMISSION_RULES.minDescriptionLength} characters.`,
    });
  } else if (text.length > SUBMISSION_RULES.maxDescriptionLength) {
    details.push({
      field: 'description',
      message: `Keep the description under ${SUBMISSION_RULES.maxDescriptionLength} characters.`,
    });
  }

  const url = githubUrl.trim();
  if (!url.startsWith(SUBMISSION_RULES.githubUrlPrefix)) {
    details.push({
      field: 'githubUrl',
      message: `The link must start with ${SUBMISSION_RULES.githubUrlPrefix}`,
    });
  } else if (!isGithubUrl(url)) {
    details.push({
      field: 'githubUrl',
      message: 'Enter a full GitHub repository, commit or pull request URL.',
    });
  }
  return details;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const taskHandlers = [
  // GP5: task progress of one enrollment, ordered by task sequence.
  mock.get('/enrollments/:id/tasks', ({ request, params }) => {
    const auth = requireAuth(request, STUDENT);
    if (auth.error) return auth.error;
    const enrollment = findEnrollment(params.id);
    if (!enrollment) return notFound('Enrollment');
    if (!canAccessEnrollment(auth.user, enrollment)) return forbidden();
    if (!isEnrollmentUnlocked(enrollment)) return enrollmentNotActive();

    const items = listProgressForEnrollment(enrollment)
      .map((item) => progressDto(item))
      .sort(bySequence);
    return json(paginate(items, request, 200));
  }),

  // GP6: one task. Locked tasks omit the instruction fields.
  mock.get('/tasks/:id/content', ({ request, params }) => {
    const loaded = loadProgress(request, params);
    if (loaded.error) return loaded.error;
    const { progress, enrollment } = loaded;

    const definition = findTaskDefinition(progress.taskId);
    if (!definition) return notFound('Task');

    const locked = progress.status === 'LOCKED';
    const task = {
      _id: definition._id,
      title: definition.title,
      sequence: definition.sequence,
      dayNumber: definition.dayNumber ?? null,
      estimatedHours: definition.estimatedHours ?? null,
      requiresTrainerReview: Boolean(definition.requiresTrainerReview),
    };
    if (!locked) {
      task.problemStatement = definition.problemStatement ?? '';
      task.expectedOutcome = definition.expectedOutcome ?? '';
      task.acceptanceCriteria = Array.isArray(definition.acceptanceCriteria)
        ? [...definition.acceptanceCriteria]
        : [];
      task.starterRepoUrl = definition.starterRepoUrl ?? null;
    }

    const teamId = progress.teamId ?? enrollment?.teamId ?? null;
    const team = teamId ? findTeam(teamId) : null;

    return json({
      locked,
      progress: progressDto(progress),
      task,
      enrollment: enrollment
        ? {
            _id: enrollment._id,
            enrollmentType: enrollment.enrollmentType,
            teamId: enrollment.teamId ?? null,
          }
        : null,
      team: team ? { _id: team._id, name: team.name, repoUrl: team.repoUrl ?? null } : null,
    });
  }),

  // AVAILABLE -> IN_PROGRESS.
  mock.post('/tasks/:id/start', ({ request, params }) => {
    const loaded = loadProgress(request, params);
    if (loaded.error) return loaded.error;
    const { progress } = loaded;

    if (progress.status === 'LOCKED') {
      return forbidden('Complete the prerequisite tasks to unlock this one.', 'TASK_LOCKED');
    }
    if (progress.status !== 'AVAILABLE') {
      return conflict('INVALID_TRANSITION', 'This task has already been started.');
    }
    const updated = startTask(progress);
    return json(progressDto(updated && typeof updated === 'object' ? updated : progress));
  }),

  // GP8: multipart submission -> 201 Submission.
  mock.post('/tasks/:id/submissions', async ({ request, params }) => {
    const loaded = loadProgress(request, params);
    if (loaded.error) return loaded.error;
    const { user, progress, enrollment } = loaded;

    if (progress.status === 'LOCKED') {
      return forbidden('Complete the prerequisite tasks to unlock this one.', 'TASK_LOCKED');
    }
    if (!SUBMITTABLE.includes(progress.status)) {
      return conflict(
        'INVALID_TRANSITION',
        progress.status === 'SUBMITTED'
          ? 'This task is already waiting for review.'
          : 'This task can no longer be submitted.',
      );
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return validationError([
        { field: 'screenshots', message: 'Send the submission as multipart form data.' },
      ]);
    }

    const files = form.getAll('screenshots').filter(isFileLike);
    const description = String(form.get('description') ?? '');
    const githubUrl = String(form.get('githubUrl') ?? '');

    const details = validateSubmission({ files, description, githubUrl });
    if (details.length) return validationError(details);

    const screenshots = [];
    for (const [index, file] of files.entries()) {
      try {
        screenshots.push(
          await storeUploadedFile(file, { enrollmentId: enrollment?._id ?? progress.enrollmentId }),
        );
      } catch (error) {
        details.push({
          field: 'screenshots',
          message: error?.message || `Screenshot ${index + 1} could not be uploaded.`,
        });
      }
    }
    if (details.length) return validationError(details);

    const submission = createSubmission({
      user,
      progress,
      screenshots,
      description: description.trim(),
      githubUrl: githubUrl.trim(),
    });
    if (!submission) {
      return apiError(500, 'MOCK_HANDLER_ERROR', 'The submission could not be saved.');
    }
    return created(submissionDto(submission));
  }),

  // GP9: attempts, newest first.
  mock.get('/tasks/:id/submissions', ({ request, params }) => {
    const loaded = loadProgress(request, params);
    if (loaded.error) return loaded.error;
    const { progress } = loaded;

    const items = db.taskSubmissions
      .filter((submission) => submission.taskProgressId === progress._id)
      .sort(
        (a, b) =>
          (Number(b.attemptNumber) || 0) - (Number(a.attemptNumber) || 0) ||
          time(b.submittedAt) - time(a.submittedAt),
      )
      .map((submission) => submissionDto(submission));
    return json(paginate(items, request, 50));
  }),
];

export default taskHandlers;
