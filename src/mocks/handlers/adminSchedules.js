import { DURATION_OPTIONS, ROLES, SCHEDULE_STATUS } from '@/shared/constants';
import { db, oid } from '../db';
import {
  addAudit,
  scheduleTemplateDto,
  scheduleTemplateSummaryDto,
  taskDefinitionDto,
} from '../services';
import {
  applySort,
  conflict,
  created,
  getQuery,
  json,
  matchesSearch,
  mock,
  noContent,
  notFound,
  paginate,
  readJson,
  requireAuth,
  unprocessable,
  validationError,
} from '../utils';

/**
 * Admin schedule templates and task definitions (KD6, KD7 / MM9, MM10). All routes are ADMIN only.
 *
 *  GET    /admin/schedules                       designationId, domainId, durationMonths, status, search
 *  POST   /admin/schedules                       { designationId, domainId, durationMonths, days[] } -> DRAFT vN
 *  GET    /admin/schedules/:id
 *  PUT    /admin/schedules/:id                   { days } (DRAFT only)
 *  PATCH  /admin/schedules/:id/publish           DRAFT -> PUBLISHED, previous PUBLISHED -> ARCHIVED
 *  GET    /admin/schedules/:id/versions          same designation / domain / duration, newest first
 *  POST   /admin/schedules/:id/clone             new DRAFT copying days + tasks (prerequisites remapped)
 *  GET    /admin/schedules/:id/tasks             task definitions by sequence
 *  PATCH  /admin/schedules/:id/tasks/reorder     { orderedIds } (DRAFT only, prerequisites first)
 *  POST   /admin/tasks                           (DRAFT template only)
 *  PUT    /admin/tasks/:id
 *  DELETE /admin/tasks/:id
 *
 * Published versions are immutable (409 TEMPLATE_PUBLISHED): changes go into a new draft version.
 */

const ADMIN_ONLY = [ROLES.ADMIN];
const { DRAFT, PUBLISHED, ARCHIVED } = SCHEDULE_STATUS;

const LIMITS = Object.freeze({
  dayTitle: 120,
  dayActivity: 1000,
  dayEvidence: 300,
  daySop: 20000,
  maxDays: 200,
  taskTitle: 150,
  problemStatement: 5000,
  expectedOutcome: 2000,
  criterion: 300,
  maxCriteria: 15,
  minHours: 1,
  maxHours: 200,
  repoUrl: 300,
});

const GITHUB_REPO_RE =
  /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]+(?:\/\S*)?$/;

// ---------------------------------------------------------------------------
// Lookups and small helpers
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString();

function asText(value) {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

const findById = (collection, id) => collection.find((doc) => doc._id === id);
const findTemplate = (id) => findById(db.scheduleTemplates, id);
const findTask = (id) => findById(db.taskDefinitions, id);

function sameCombination(a, b) {
  return (
    a.designationId === b.designationId &&
    a.domainId === b.domainId &&
    Number(a.durationMonths) === Number(b.durationMonths)
  );
}

const versionsOf = (combination) =>
  db.scheduleTemplates.filter((template) => sameCombination(template, combination));

function nextVersion(combination) {
  return versionsOf(combination).reduce((max, template) => Math.max(max, Number(template.version) || 0), 0) + 1;
}

function tasksOf(templateId) {
  return db.taskDefinitions
    .filter((task) => task.templateId === templateId)
    .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
}

/** Renumbers a template's tasks 1..n, keeping their current order. */
function resequence(templateId) {
  tasksOf(templateId).forEach((task, index) => {
    task.sequence = index + 1;
  });
}

function lockedError(template) {
  if (template.status === ARCHIVED) {
    return conflict(
      'TEMPLATE_PUBLISHED',
      "Archived versions can't be changed. Create a new draft to make changes.",
    );
  }
  return conflict(
    'TEMPLATE_PUBLISHED',
    "Published versions can't be edited. Create a new draft to make changes.",
  );
}

function templateSnapshot(template) {
  return {
    version: template.version,
    status: template.status,
    designationId: template.designationId,
    domainId: template.domainId,
    durationMonths: template.durationMonths,
    daysCount: Array.isArray(template.days) ? template.days.length : 0,
  };
}

function taskSnapshot(task) {
  return {
    title: task.title,
    sequence: task.sequence,
    dayNumber: task.dayNumber ?? null,
    estimatedHours: task.estimatedHours,
    requiresTrainerReview: task.requiresTrainerReview,
    criteriaCount: Array.isArray(task.acceptanceCriteria) ? task.acceptanceCriteria.length : 0,
    prerequisiteTaskIds: [...(task.prerequisiteTaskIds ?? [])],
  };
}

function audit(user, action, entityType, entityId, before, after) {
  addAudit({ actorId: user._id, action, entityType, entityId, before, after });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const emptyDay = (dayNumber) => ({
  dayNumber,
  title: '',
  activity: '',
  sopContent: '',
  requiredEvidence: '',
});

/**
 * Normalises days in the order received (dayNumber = index + 1). Titles are required unless
 * `requireTitles` is false (a brand-new draft starts with one empty day).
 */
function normalizeDays(rawDays, { requireTitles }) {
  const details = [];
  if (!Array.isArray(rawDays)) {
    return { days: [], details: [{ field: 'days', message: 'Send the days as a list.' }] };
  }
  if (requireTitles && rawDays.length === 0) {
    details.push({ field: 'days', message: 'Add at least one day.' });
  }
  if (rawDays.length > LIMITS.maxDays) {
    details.push({ field: 'days', message: `A schedule can have up to ${LIMITS.maxDays} days.` });
  }

  const tooLong = (index, field, value, max) => {
    if (value.length > max) {
      details.push({ field: `days.${index}.${field}`, message: `Use ${max} characters or fewer.` });
    }
  };

  const days = rawDays.map((raw, index) => {
    const day = raw && typeof raw === 'object' ? raw : {};
    const title = asText(day.title).trim();
    const activity = asText(day.activity).trim();
    const requiredEvidence = asText(day.requiredEvidence).trim();
    const sopContent = asText(day.sopContent).replace(/\s+$/, '');
    if (requireTitles && !title) {
      details.push({ field: `days.${index}.title`, message: 'Give this day a title.' });
    }
    tooLong(index, 'title', title, LIMITS.dayTitle);
    tooLong(index, 'activity', activity, LIMITS.dayActivity);
    tooLong(index, 'requiredEvidence', requiredEvidence, LIMITS.dayEvidence);
    tooLong(index, 'sopContent', sopContent, LIMITS.daySop);
    return { dayNumber: index + 1, title, activity, sopContent, requiredEvidence };
  });

  return { days, details };
}

/** Validates the editable fields of a task definition. */
function normalizeTask(body, template) {
  const details = [];
  const add = (field, message) => details.push({ field, message });

  const title = asText(body.title).trim();
  if (!title) add('title', 'Give the task a title.');
  else if (title.length > LIMITS.taskTitle) add('title', `Use ${LIMITS.taskTitle} characters or fewer.`);

  const problemStatement = asText(body.problemStatement).trim();
  if (!problemStatement) add('problemStatement', 'Describe the problem students solve.');
  else if (problemStatement.length > LIMITS.problemStatement) {
    add('problemStatement', `Use ${LIMITS.problemStatement} characters or fewer.`);
  }

  const expectedOutcome = asText(body.expectedOutcome).trim();
  if (!expectedOutcome) add('expectedOutcome', 'Describe what a finished task looks like.');
  else if (expectedOutcome.length > LIMITS.expectedOutcome) {
    add('expectedOutcome', `Use ${LIMITS.expectedOutcome} characters or fewer.`);
  }

  const rawCriteria = Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [];
  const acceptanceCriteria = rawCriteria.map((item) => asText(item).trim());
  if (acceptanceCriteria.length === 0) {
    add('acceptanceCriteria', 'Add at least one acceptance criterion.');
  } else if (acceptanceCriteria.length > LIMITS.maxCriteria) {
    add('acceptanceCriteria', `Add up to ${LIMITS.maxCriteria} criteria.`);
  }
  acceptanceCriteria.forEach((criterion, index) => {
    if (!criterion) add(`acceptanceCriteria.${index}`, 'Write this criterion or remove it.');
    else if (criterion.length > LIMITS.criterion) {
      add(`acceptanceCriteria.${index}`, `Use ${LIMITS.criterion} characters or fewer.`);
    }
  });

  const starterRepoUrl = asText(body.starterRepoUrl).trim();
  if (starterRepoUrl && (starterRepoUrl.length > LIMITS.repoUrl || !GITHUB_REPO_RE.test(starterRepoUrl))) {
    add('starterRepoUrl', 'Use a GitHub repository link, like https://github.com/org/repo.');
  }

  const estimatedHours = Number(body.estimatedHours);
  if (
    body.estimatedHours === null ||
    body.estimatedHours === undefined ||
    body.estimatedHours === '' ||
    !Number.isFinite(estimatedHours) ||
    estimatedHours < LIMITS.minHours ||
    estimatedHours > LIMITS.maxHours
  ) {
    add('estimatedHours', `Use between ${LIMITS.minHours} and ${LIMITS.maxHours} hours.`);
  }

  let dayNumber = null;
  if (body.dayNumber !== null && body.dayNumber !== undefined && body.dayNumber !== '') {
    dayNumber = Number(body.dayNumber);
    const dayCount = Array.isArray(template.days) ? template.days.length : 0;
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > dayCount) {
      add('dayNumber', dayCount > 0 ? `Pick a day between 1 and ${dayCount}.` : 'This schedule has no days yet.');
    }
  }

  if (body.prerequisiteTaskIds !== undefined && !Array.isArray(body.prerequisiteTaskIds)) {
    add('prerequisiteTaskIds', 'Send the prerequisites as a list of task ids.');
  }
  const prerequisiteTaskIds = Array.isArray(body.prerequisiteTaskIds)
    ? [...new Set(body.prerequisiteTaskIds.map((id) => asText(id)).filter(Boolean))]
    : [];

  return {
    details,
    values: {
      title,
      problemStatement,
      expectedOutcome,
      acceptanceCriteria,
      starterRepoUrl: starterRepoUrl || null,
      estimatedHours,
      requiresTrainerReview:
        body.requiresTrainerReview === undefined ? true : Boolean(body.requiresTrainerReview),
      dayNumber,
      prerequisiteTaskIds,
    },
  };
}

/** True when `fromId` needs `targetId`, directly or through other prerequisites. */
function dependsOn(byId, fromId, targetId) {
  const seen = new Set();
  const stack = [...(byId.get(fromId)?.prerequisiteTaskIds ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === targetId) return true;
    if (!seen.has(id)) {
      seen.add(id);
      stack.push(...(byId.get(id)?.prerequisiteTaskIds ?? []));
    }
  }
  return false;
}

function circularPrerequisite(message) {
  return unprocessable('CIRCULAR_PREREQUISITE', message, [{ field: 'prerequisiteTaskIds', message }]);
}

/**
 * Prerequisites must belong to the same template, come earlier in the sequence and never form a
 * loop. Returns an error response, or null when they are fine.
 */
function checkPrerequisites({ templateId, taskId, sequence, prerequisiteTaskIds }) {
  const byId = new Map(tasksOf(templateId).map((task) => [task._id, task]));
  for (const id of prerequisiteTaskIds) {
    if (taskId && id === taskId) return circularPrerequisite("A task can't be its own prerequisite.");
    const prerequisite = byId.get(id);
    if (!prerequisite) {
      return unprocessable(
        'VALIDATION_ERROR',
        'Prerequisites must be tasks of the same schedule version.',
        [{ field: 'prerequisiteTaskIds', message: 'Pick prerequisites from this version only.' }],
      );
    }
    if ((Number(prerequisite.sequence) || 0) >= sequence) {
      return circularPrerequisite(
        `“${prerequisite.title}” comes after this task, so it can't be a prerequisite.`,
      );
    }
    if (taskId && dependsOn(byId, id, taskId)) {
      return circularPrerequisite(
        `“${prerequisite.title}” already depends on this task, so adding it would create a loop.`,
      );
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const adminScheduleHandlers = [
  // ---- Schedule templates --------------------------------------------------
  mock.get('/admin/schedules', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const designationId = query.get('designationId');
    const domainId = query.get('domainId');
    const durationMonths = Number(query.get('durationMonths')) || null;
    const status = query.get('status');
    const search = query.get('search');

    const templates = db.scheduleTemplates.filter((template) => {
      if (designationId && template.designationId !== designationId) return false;
      if (domainId && template.domainId !== domainId) return false;
      if (durationMonths && Number(template.durationMonths) !== durationMonths) return false;
      if (status && template.status !== status) return false;
      if (search) {
        const designation = findById(db.designations, template.designationId);
        const domain = findById(db.domains, template.domainId);
        return matchesSearch(search, designation?.name, domain?.name, `v${template.version}`);
      }
      return true;
    });

    const items = applySort(templates.map(scheduleTemplateSummaryDto), request, 'updatedAt:desc');
    return json(paginate(items, request, 10));
  }),

  mock.post('/admin/schedules', async ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const details = [];
    const designation = findById(db.designations, asText(body.designationId));
    if (!designation) details.push({ field: 'designationId', message: 'Choose a designation.' });
    const domain = findById(db.domains, asText(body.domainId));
    if (!domain) details.push({ field: 'domainId', message: 'Choose a domain.' });
    const durationMonths = Number(body.durationMonths);
    if (!DURATION_OPTIONS.includes(durationMonths)) {
      details.push({
        field: 'durationMonths',
        message: `Choose a duration of ${DURATION_OPTIONS.join(', ')} months.`,
      });
    }
    const { days, details: dayDetails } = normalizeDays(body.days === undefined ? [] : body.days, {
      requireTitles: false,
    });
    details.push(...dayDetails);
    if (details.length > 0) return validationError(details);

    const timestamp = nowIso();
    const combination = { designationId: designation._id, domainId: domain._id, durationMonths };
    const template = {
      _id: oid(),
      ...combination,
      version: nextVersion(combination),
      status: DRAFT,
      days: days.length > 0 ? days : [emptyDay(1)],
      createdBy: auth.user._id,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: null,
    };
    db.scheduleTemplates.push(template);
    audit(auth.user, 'SCHEDULE_CREATED', 'ScheduleTemplate', template._id, null, templateSnapshot(template));
    return created(scheduleTemplateDto(template));
  }),

  mock.get('/admin/schedules/:id', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    return json(scheduleTemplateDto(template));
  }),

  mock.put('/admin/schedules/:id', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    if (template.status !== DRAFT) return lockedError(template);

    const body = await readJson(request);
    const { days, details } = normalizeDays(body.days, { requireTitles: true });
    if (details.length > 0) return validationError(details);

    const before = templateSnapshot(template);
    const timestamp = nowIso();
    template.days = days;
    template.updatedAt = timestamp;
    // Tasks tied to a day that no longer exists are no longer tied to a day.
    tasksOf(template._id).forEach((task) => {
      if (task.dayNumber && task.dayNumber > days.length) {
        task.dayNumber = null;
        task.updatedAt = timestamp;
      }
    });
    audit(auth.user, 'SCHEDULE_UPDATED', 'ScheduleTemplate', template._id, before, templateSnapshot(template));
    return json(scheduleTemplateDto(template));
  }),

  mock.patch('/admin/schedules/:id/publish', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    if (template.status === PUBLISHED) {
      return conflict('TEMPLATE_PUBLISHED', `Version ${template.version} is already published.`);
    }
    if (template.status !== DRAFT) {
      return conflict(
        'INVALID_TRANSITION',
        "Archived versions can't be published again. Create a new draft instead.",
      );
    }

    const { details } = normalizeDays(template.days ?? [], { requireTitles: true });
    if (details.length > 0) {
      return validationError(details, 'Every version needs at least one day, and every day needs a title.');
    }

    const timestamp = nowIso();
    const archived = versionsOf(template).filter(
      (other) => other._id !== template._id && other.status === PUBLISHED,
    );
    archived.forEach((other) => {
      other.status = ARCHIVED;
      other.updatedAt = timestamp;
    });
    template.status = PUBLISHED;
    template.publishedAt = timestamp;
    template.updatedAt = timestamp;

    audit(
      auth.user,
      'SCHEDULE_PUBLISHED',
      'ScheduleTemplate',
      template._id,
      { version: template.version, status: DRAFT },
      {
        version: template.version,
        status: PUBLISHED,
        archivedVersions: archived.map((other) => other.version),
      },
    );
    return json(scheduleTemplateDto(template));
  }),

  mock.get('/admin/schedules/:id/versions', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    const items = versionsOf(template)
      .sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0))
      .map(scheduleTemplateSummaryDto);
    return json({ items, page: 1, limit: Math.max(1, items.length), total: items.length });
  }),

  mock.post('/admin/schedules/:id/clone', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const source = findTemplate(params.id);
    if (!source) return notFound('Schedule');

    const timestamp = nowIso();
    const copy = {
      _id: oid(),
      designationId: source.designationId,
      domainId: source.domainId,
      durationMonths: source.durationMonths,
      version: nextVersion(source),
      status: DRAFT,
      days: (Array.isArray(source.days) ? source.days : []).map((day, index) => ({
        dayNumber: index + 1,
        title: asText(day?.title),
        activity: asText(day?.activity),
        sopContent: asText(day?.sopContent),
        requiredEvidence: asText(day?.requiredEvidence),
      })),
      createdBy: auth.user._id,
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: null,
    };
    if (copy.days.length === 0) copy.days.push(emptyDay(1));
    db.scheduleTemplates.push(copy);

    const sourceTasks = tasksOf(source._id);
    const idMap = new Map(sourceTasks.map((task) => [task._id, oid()]));
    sourceTasks.forEach((task, index) => {
      db.taskDefinitions.push({
        ...task,
        _id: idMap.get(task._id),
        templateId: copy._id,
        templateVersion: copy.version,
        sequence: index + 1,
        acceptanceCriteria: [...(task.acceptanceCriteria ?? [])],
        prerequisiteTaskIds: (task.prerequisiteTaskIds ?? [])
          .map((id) => idMap.get(id))
          .filter(Boolean),
        createdBy: auth.user._id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });

    audit(auth.user, 'SCHEDULE_CLONED', 'ScheduleTemplate', copy._id, null, {
      ...templateSnapshot(copy),
      clonedFromId: source._id,
      clonedFromVersion: source.version,
      tasksCount: sourceTasks.length,
    });
    return created(scheduleTemplateDto(copy));
  }),

  // ---- Task definitions of a template ---------------------------------------
  mock.get('/admin/schedules/:id/tasks', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    return json(paginate(tasksOf(template._id).map(taskDefinitionDto), request, 200));
  }),

  mock.patch('/admin/schedules/:id/tasks/reorder', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const template = findTemplate(params.id);
    if (!template) return notFound('Schedule');
    if (template.status !== DRAFT) return lockedError(template);

    const body = await readJson(request);
    const tasks = tasksOf(template._id);
    const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map((id) => asText(id)) : null;
    const isComplete =
      orderedIds &&
      orderedIds.length === tasks.length &&
      new Set(orderedIds).size === orderedIds.length &&
      tasks.every((task) => orderedIds.includes(task._id));
    if (!isComplete) {
      return validationError(
        [{ field: 'orderedIds', message: 'Send every task of this version exactly once.' }],
        'The task list changed. Refresh the page and try again.',
      );
    }

    const position = new Map(orderedIds.map((id, index) => [id, index]));
    const byId = new Map(tasks.map((task) => [task._id, task]));
    for (const task of tasks) {
      for (const prerequisiteId of task.prerequisiteTaskIds ?? []) {
        if (position.has(prerequisiteId) && position.get(prerequisiteId) > position.get(task._id)) {
          const message = `“${task.title}” has to come after its prerequisite “${
            byId.get(prerequisiteId)?.title ?? 'another task'
          }”.`;
          return unprocessable('VALIDATION_ERROR', message, [{ field: 'orderedIds', message }]);
        }
      }
    }

    const before = tasks.map((task) => task._id);
    const timestamp = nowIso();
    tasks.forEach((task) => {
      const sequence = position.get(task._id) + 1;
      if (task.sequence !== sequence) {
        task.sequence = sequence;
        task.updatedAt = timestamp;
      }
    });
    template.updatedAt = timestamp;
    audit(auth.user, 'TASKS_REORDERED', 'ScheduleTemplate', template._id, { order: before }, { order: orderedIds });
    return json(paginate(tasksOf(template._id).map(taskDefinitionDto), request, 200));
  }),

  // ---- Task definitions ----------------------------------------------------
  mock.post('/admin/tasks', async ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const template = findTemplate(asText(body.templateId));
    if (!template) return notFound('Schedule');
    if (template.status !== DRAFT) return lockedError(template);

    const { values, details } = normalizeTask(body, template);
    if (details.length > 0) return validationError(details);

    const sequence =
      tasksOf(template._id).reduce((max, task) => Math.max(max, Number(task.sequence) || 0), 0) + 1;
    const problem = checkPrerequisites({
      templateId: template._id,
      taskId: null,
      sequence,
      prerequisiteTaskIds: values.prerequisiteTaskIds,
    });
    if (problem) return problem;

    const timestamp = nowIso();
    const task = {
      _id: oid(),
      templateId: template._id,
      templateVersion: template.version,
      sequence,
      ...values,
      createdBy: auth.user._id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.taskDefinitions.push(task);
    template.updatedAt = timestamp;
    audit(auth.user, 'TASK_CREATED', 'TaskDefinition', task._id, null, taskSnapshot(task));
    return created(taskDefinitionDto(task));
  }),

  mock.put('/admin/tasks/:id', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const task = findTask(params.id);
    if (!task) return notFound('Task');
    const template = findTemplate(task.templateId);
    if (!template) return notFound('Schedule');
    if (template.status !== DRAFT) return lockedError(template);

    const body = await readJson(request);
    const { values, details } = normalizeTask(body, template);
    if (details.length > 0) return validationError(details);

    const problem = checkPrerequisites({
      templateId: template._id,
      taskId: task._id,
      sequence: Number(task.sequence) || 0,
      prerequisiteTaskIds: values.prerequisiteTaskIds,
    });
    if (problem) return problem;

    const before = taskSnapshot(task);
    const timestamp = nowIso();
    Object.assign(task, values, { updatedAt: timestamp });
    template.updatedAt = timestamp;
    audit(auth.user, 'TASK_UPDATED', 'TaskDefinition', task._id, before, taskSnapshot(task));
    return json(taskDefinitionDto(task));
  }),

  mock.delete('/admin/tasks/:id', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    const task = findTask(params.id);
    if (!task) return notFound('Task');
    const template = findTemplate(task.templateId);
    if (template && template.status !== DRAFT) return lockedError(template);

    const timestamp = nowIso();
    const index = db.taskDefinitions.indexOf(task);
    if (index >= 0) db.taskDefinitions.splice(index, 1);
    db.taskDefinitions.forEach((other) => {
      if (other.templateId === task.templateId && (other.prerequisiteTaskIds ?? []).includes(task._id)) {
        other.prerequisiteTaskIds = other.prerequisiteTaskIds.filter((id) => id !== task._id);
        other.updatedAt = timestamp;
      }
    });
    resequence(task.templateId);
    if (template) template.updatedAt = timestamp;
    audit(auth.user, 'TASK_DELETED', 'TaskDefinition', task._id, taskSnapshot(task), null);
    return noContent();
  }),
];

export default adminScheduleHandlers;
