import { ROLES, TEAM_STATUS } from '@/shared/constants';
import { db } from '../db';
import {
  adminAssignmentDto,
  adminTeamDto,
  applyReview,
  assignTrainer,
  assignmentsForTrainer,
  computeTrainerStats,
  findAssignment,
  findEnrollment,
  findSubmission,
  findTeam,
  findUser,
  reviewResultDto,
  submissionsForTrainer,
  trainerAssignmentViewDto,
  trainerCanAccessSubmission,
  trainerSubmissionDetailDto,
  trainerSubmissionListItemDto,
  unassignTrainer,
} from '../services';
import {
  applySort,
  created,
  forbidden,
  getQuery,
  json,
  matchesSearch,
  mock,
  noContent,
  notFound,
  paginate,
  readJson,
  requireAuth,
  validationError,
} from '../utils';

/**
 * Trainer workspace (MM13, MM14; tickets KD9, KD10, KD13) and admin trainer assignment (KD11).
 * docs/API_CONTRACT.md "Trainer" + "/admin/trainer-assignments" + "/admin/teams".
 * A trainer only ever sees submissions of the enrollments/teams actively assigned to them.
 */

const TRAINER_ONLY = [ROLES.TRAINER];
const ADMIN_ONLY = [ROLES.ADMIN];
const NOT_ASSIGNED_MESSAGE = "This submission isn't assigned to you.";

function time(value) {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** 'true' | 'false' -> boolean; missing, '' or 'all' -> null (no filter). */
function boolParam(query, name) {
  const value = query.get(name);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

/** ?status=A,B or ?status=A&status=B */
function listParam(query, name) {
  return query
    .getAll(name)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function trimmedId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/** Loads a submission the signed-in trainer may review. Returns { user, submission } or { error }. */
function loadTrainerSubmission(request, params) {
  const auth = requireAuth(request, TRAINER_ONLY);
  if (auth.error) return { error: auth.error };
  const submission = findSubmission(params.id);
  if (!submission) return { error: notFound('Submission') };
  if (!trainerCanAccessSubmission(auth.user._id, submission)) {
    return { error: forbidden(NOT_ASSIGNED_MESSAGE) };
  }
  return { user: auth.user, submission };
}

export const trainerHandlers = [
  // ---------------------------------------------------------------------------
  // Trainer (role TRAINER)
  // ---------------------------------------------------------------------------

  // KD9 KPI tiles + sidebar badge (frontend addition).
  mock.get('/trainer/stats', ({ request }) => {
    const auth = requireAuth(request, TRAINER_ONLY);
    if (auth.error) return auth.error;
    return json(computeTrainerStats(auth.user._id));
  }),

  // KD9 / KD13: active assignments with progress, pending reviews and last activity.
  mock.get('/trainer/assignments', ({ request }) => {
    const auth = requireAuth(request, TRAINER_ONLY);
    if (auth.error) return auth.error;
    const search = getQuery(request).get('search');

    const items = assignmentsForTrainer(auth.user._id)
      .map(trainerAssignmentViewDto)
      .filter(Boolean)
      .filter((row) =>
        matchesSearch(search, row.student?.name, row.student?.email, row.team?.name),
      )
      .sort((a, b) => time(a.lastActivityAt) - time(b.lastActivityAt));
    return json(paginate(items, request, 100));
  }),

  // KD9 queue: the trainer's submissions with ?status (PENDING by default in the UI), oldest first.
  mock.get('/trainer/submissions', ({ request }) => {
    const auth = requireAuth(request, TRAINER_ONLY);
    if (auth.error) return auth.error;
    const query = getQuery(request);
    const status = query.get('status') || undefined;
    const search = query.get('search');

    let items = submissionsForTrainer(auth.user._id, { status })
      .map(trainerSubmissionListItemDto)
      .filter(Boolean);
    if (search) {
      items = items.filter((row) =>
        matchesSearch(
          search,
          row.student?.name,
          row.student?.email,
          row.team?.name,
          row.submittedBy?.name,
          row.task?.title,
          row.task ? `Task ${row.task.sequence}` : '',
        ),
      );
    }
    return json(paginate(applySort(items, request, 'submittedAt:asc'), request, 10));
  }),

  // KD10 review screen: 403 unless the submission belongs to the trainer's assignments.
  mock.get('/trainer/submissions/:id', ({ request, params }) => {
    const loaded = loadTrainerSubmission(request, params);
    if (loaded.error) return loaded.error;
    return json(trainerSubmissionDetailDto(loaded.submission, loaded.user._id));
  }),

  // KD10 / MM14 decision. applyReview enforces: 409 ALREADY_REVIEWED, 422 feedback (unless
  // APPROVED), 422 CHECKS_FAILED; it updates the task, unlocks dependents and checks certificates.
  mock.post('/trainer/submissions/:id/review', async ({ request, params }) => {
    const loaded = loadTrainerSubmission(request, params);
    if (loaded.error) return loaded.error;
    const body = await readJson(request);
    const result = applyReview({
      trainer: loaded.user,
      submission: loaded.submission,
      decision: body.decision,
      feedback: typeof body.feedback === 'string' ? body.feedback : '',
    });
    return json(reviewResultDto(result));
  }),

  // ---------------------------------------------------------------------------
  // Admin (role ADMIN): teams lookup and trainer assignments (KD11)
  // ---------------------------------------------------------------------------

  // Frontend addition: team picker for assignments. ?search (team or leader), ?status.
  mock.get('/admin/teams', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const query = getQuery(request);
    const search = query.get('search');
    const statuses = listParam(query, 'status');

    const items = db.teams
      .filter((team) => statuses.length === 0 || statuses.includes(team.status))
      .filter((team) => {
        if (!search) return true;
        const leader = findUser(team.leaderId);
        return matchesSearch(search, team.name, leader?.name, leader?.email);
      })
      .sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map(adminTeamDto)
      .filter(Boolean);
    return json(paginate(items, request, 20));
  }),

  // ?search (trainer, student or team), ?active=true|false|all (default all), newest first.
  mock.get('/admin/trainer-assignments', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const query = getQuery(request);
    const search = query.get('search');
    const active = boolParam(query, 'active');

    const items = db.trainerAssignments
      .filter((assignment) => active === null || Boolean(assignment.active) === active)
      .sort((a, b) => time(b.assignedAt) - time(a.assignedAt))
      .map(adminAssignmentDto)
      .filter(Boolean)
      .filter((row) =>
        matchesSearch(
          search,
          row.trainer?.name,
          row.trainer?.email,
          row.enrollment?.student?.name,
          row.enrollment?.student?.email,
          row.team?.name,
        ),
      );
    return json(paginate(items, request, 10));
  }),

  // { trainerId, enrollmentId } or { trainerId, teamId }. The previous active assignment of the
  // same target is ended (history kept); assignTrainer validates the trainer and audits the change.
  mock.post('/admin/trainer-assignments', async ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const trainerId = trimmedId(body.trainerId);
    const enrollmentId = trimmedId(body.enrollmentId);
    const teamId = trimmedId(body.teamId);

    const details = [];
    if (!trainerId) details.push({ field: 'trainerId', message: 'Choose a trainer.' });
    if (!enrollmentId && !teamId) {
      details.push({ field: 'enrollmentId', message: 'Choose a student enrollment or a team.' });
    } else if (enrollmentId && teamId) {
      details.push({ field: 'teamId', message: 'Choose either an enrollment or a team, not both.' });
    }
    if (details.length > 0) return validationError(details);

    if (enrollmentId && !findEnrollment(enrollmentId)) {
      return validationError([{ field: 'enrollmentId', message: 'That enrollment no longer exists.' }]);
    }
    if (teamId) {
      const team = findTeam(teamId);
      if (!team) {
        return validationError([{ field: 'teamId', message: 'That team no longer exists.' }]);
      }
      if (team.status === TEAM_STATUS.DISBANDED) {
        return validationError([
          { field: 'teamId', message: "This team was disbanded, so it can't get a trainer." },
        ]);
      }
    }

    const assignment = assignTrainer({
      admin: auth.user,
      trainerId,
      enrollmentId: enrollmentId || null,
      teamId: teamId || null,
    });
    return created(adminAssignmentDto(assignment));
  }),

  // Ends an assignment (active:false); the history is kept.
  mock.delete('/admin/trainer-assignments/:id', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const assignment = findAssignment(params.id);
    if (!assignment) return notFound('Assignment');
    unassignTrainer({ admin: auth.user, assignmentId: assignment._id });
    return noContent();
  }),
];

export default trainerHandlers;
