import { z } from 'zod';
import { DURATION_OPTIONS } from '@/shared/constants';
import { createRowKey } from '../utils/days';

/** Client-side limits (the server re-validates). */
export const DAY_LIMITS = Object.freeze({
  title: 120,
  activity: 1000,
  requiredEvidence: 300,
  sopContent: 20000,
  maxDays: 200,
});

export const TASK_LIMITS = Object.freeze({
  title: 150,
  problemStatement: 5000,
  expectedOutcome: 2000,
  criterion: 300,
  maxCriteria: 15,
  minHours: 1,
  maxHours: 200,
  starterRepoUrl: 300,
});

/** A repository link: https://github.com/<owner>/<repo>, optionally followed by a path. */
const GITHUB_REPO_RE = /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]+(?:\/\S*)?$/;

export function isGithubRepoUrl(value) {
  return GITHUB_REPO_RE.test(String(value ?? '').trim());
}

// ---------------------------------------------------------------------------
// New schedule (designation + domain + duration)
// ---------------------------------------------------------------------------

export const createScheduleSchema = z.object({
  designationId: z.string().min(1, 'Choose a designation'),
  domainId: z.string().min(1, 'Choose a domain'),
  durationMonths: z
    .string()
    .refine((value) => DURATION_OPTIONS.includes(Number(value)), 'Choose a duration'),
});

// ---------------------------------------------------------------------------
// Days (KD6): at least one day, every day needs a title
// ---------------------------------------------------------------------------

export const daySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give this day a title')
    .max(DAY_LIMITS.title, `Use ${DAY_LIMITS.title} characters or fewer`),
  activity: z.string().max(DAY_LIMITS.activity, `Use ${DAY_LIMITS.activity} characters or fewer`),
  requiredEvidence: z
    .string()
    .max(DAY_LIMITS.requiredEvidence, `Use ${DAY_LIMITS.requiredEvidence} characters or fewer`),
  sopContent: z
    .string()
    .max(DAY_LIMITS.sopContent, `Use ${DAY_LIMITS.sopContent} characters or fewer`),
});

export const scheduleDaysSchema = z
  .array(daySchema)
  .min(1, 'Add at least one day')
  .max(DAY_LIMITS.maxDays, `A schedule can have up to ${DAY_LIMITS.maxDays} days`);

const VALID_DAYS = Object.freeze({ isValid: true, formError: null, dayErrors: {}, count: 0 });

/**
 * Validates editable day rows. Returns { isValid, formError, dayErrors: { [index]: { field: message } }, count }.
 */
export function validateDays(days) {
  const result = scheduleDaysSchema.safeParse(Array.isArray(days) ? days : []);
  if (result.success) return VALID_DAYS;
  let formError = null;
  const dayErrors = {};
  let count = 0;
  result.error.issues.forEach((issue) => {
    const [index, field] = issue.path;
    if (typeof index === 'number' && typeof field === 'string') {
      if (!dayErrors[index]) dayErrors[index] = {};
      if (!dayErrors[index][field]) {
        dayErrors[index][field] = issue.message;
        count += 1;
      }
    } else if (!formError) {
      formError = issue.message;
      count += 1;
    }
  });
  return { isValid: false, formError, dayErrors, count };
}

/**
 * Server validation details (`days.3.title` or `days[3].title`) -> { formError, dayErrors }.
 * Returns null when the error carries no day-level details.
 */
export function mapServerDayErrors(error) {
  const details = Array.isArray(error?.details) ? error.details : [];
  let formError = null;
  const dayErrors = {};
  let count = 0;
  details.forEach((detail) => {
    const field = String(detail?.field ?? '');
    const match = field.match(/^days(?:\.|\[)(\d+)\]?(?:\.(\w+))?$/);
    if (match && match[2]) {
      const index = Number(match[1]);
      if (!dayErrors[index]) dayErrors[index] = {};
      if (!dayErrors[index][match[2]]) {
        dayErrors[index][match[2]] = detail.message;
        count += 1;
      }
    } else if (field === 'days' && !formError) {
      formError = detail.message;
      count += 1;
    }
  });
  return count > 0 ? { formError, dayErrors, count } : null;
}

// ---------------------------------------------------------------------------
// Task definitions (KD7)
// ---------------------------------------------------------------------------

const hoursSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
  z
    .number({
      required_error: 'Enter the estimated hours',
      invalid_type_error: 'Enter the estimated hours as a number',
    })
    .min(TASK_LIMITS.minHours, `Use at least ${TASK_LIMITS.minHours} hour`)
    .max(TASK_LIMITS.maxHours, `Use ${TASK_LIMITS.maxHours} hours or fewer`),
);

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the task a title')
    .max(TASK_LIMITS.title, `Use ${TASK_LIMITS.title} characters or fewer`),
  problemStatement: z
    .string()
    .trim()
    .min(1, 'Describe the problem students solve')
    .max(TASK_LIMITS.problemStatement, `Use ${TASK_LIMITS.problemStatement} characters or fewer`),
  expectedOutcome: z
    .string()
    .trim()
    .min(1, 'Describe what a finished task looks like')
    .max(TASK_LIMITS.expectedOutcome, `Use ${TASK_LIMITS.expectedOutcome} characters or fewer`),
  acceptanceCriteria: z
    .array(
      z.object({
        key: z.string(),
        text: z
          .string()
          .trim()
          .min(1, 'Write this criterion or remove it')
          .max(TASK_LIMITS.criterion, `Use ${TASK_LIMITS.criterion} characters or fewer`),
      }),
    )
    .min(1, 'Add at least one acceptance criterion')
    .max(TASK_LIMITS.maxCriteria, `Add up to ${TASK_LIMITS.maxCriteria} criteria`),
  starterRepoUrl: z
    .string()
    .trim()
    .max(TASK_LIMITS.starterRepoUrl, `Use ${TASK_LIMITS.starterRepoUrl} characters or fewer`)
    .refine(
      (value) => value === '' || isGithubRepoUrl(value),
      'Use a GitHub repository link, like https://github.com/org/repo',
    ),
  estimatedHours: hoursSchema,
  requiresTrainerReview: z.boolean(),
  /** '' = not tied to a day; otherwise the day number as a string (native select value). */
  dayNumber: z.string(),
  prerequisiteTaskIds: z.array(z.string()),
});

export function emptyCriterion() {
  return { key: createRowKey('criterion'), text: '' };
}

/** Task definition (or null for a new task) -> react-hook-form values. */
export function taskToFormValues(task) {
  const criteria = Array.isArray(task?.acceptanceCriteria) ? task.acceptanceCriteria : [];
  return {
    title: task?.title ?? '',
    problemStatement: task?.problemStatement ?? '',
    expectedOutcome: task?.expectedOutcome ?? '',
    acceptanceCriteria:
      criteria.length > 0
        ? criteria.map((item) => ({ key: createRowKey('criterion'), text: String(item ?? '') }))
        : [emptyCriterion()],
    starterRepoUrl: task?.starterRepoUrl ?? '',
    estimatedHours:
      task?.estimatedHours === null || task?.estimatedHours === undefined
        ? ''
        : String(task.estimatedHours),
    requiresTrainerReview: task ? Boolean(task.requiresTrainerReview) : true,
    dayNumber: task?.dayNumber ? String(task.dayNumber) : '',
    prerequisiteTaskIds: Array.isArray(task?.prerequisiteTaskIds) ? [...task.prerequisiteTaskIds] : [],
  };
}

/** Parsed form values -> POST/PUT /admin/tasks body. */
export function formValuesToTaskPayload(values, { templateId, sequence } = {}) {
  const payload = {
    templateId,
    title: values.title,
    problemStatement: values.problemStatement,
    expectedOutcome: values.expectedOutcome,
    acceptanceCriteria: values.acceptanceCriteria
      .map((criterion) => String(criterion.text ?? '').trim())
      .filter(Boolean),
    starterRepoUrl: values.starterRepoUrl ? values.starterRepoUrl : null,
    prerequisiteTaskIds: [...values.prerequisiteTaskIds],
    requiresTrainerReview: Boolean(values.requiresTrainerReview),
    estimatedHours: Number(values.estimatedHours),
    dayNumber: values.dayNumber ? Number(values.dayNumber) : null,
  };
  if (sequence) payload.sequence = sequence;
  return payload;
}
