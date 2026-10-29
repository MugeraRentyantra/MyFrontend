import { ASSESSMENT_OPTION_COUNT, ASSESSMENT_QUESTION_COUNT, CURRENCY, DURATION_OPTIONS } from '@/shared/constants';
import { slugify } from '@/shared/utils/helpers';
import { db, oid } from '../db';
import { addAudit, planDto, validateQuestions, validateSlabs } from '../services';
import {
  applySort,
  conflict,
  created,
  getQuery,
  json,
  matchesSearch,
  mock,
  notFound,
  paginate,
  readJson,
  requireAuth,
  unprocessable,
  validationError,
} from '../utils';

/**
 * Admin catalog configuration (MM4, MM5, MM6; tickets KD3, KD4, KD5). Every route is ADMIN only.
 *   - designations and domains: list / create / update / publish-unpublish (no hard delete)
 *   - internship plans and base prices (integer paise)
 *   - assessment configs (15 questions + discount slabs), saved as drafts and published as versions
 * Every change appends an audit log entry.
 */

const ADMIN = ['ADMIN'];
const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED'];

const NAME_MIN = 2;
const NAME_MAX = 60;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 500;

/** ₹10,00,000 in paise. */
const MAX_BASE_PRICE = 100000000;

const QUESTION_TEXT_MAX = 1000;
const OPTION_TEXT_MAX = 300;
const MAX_SLABS = 16;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString();

function byId(collection, id) {
  return collection.find((doc) => doc._id === id);
}

function refOf(doc) {
  return doc ? { _id: doc._id, name: doc.name, slug: doc.slug } : null;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function cleanMultiline(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sameName(a, b) {
  return cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
}

function uniqueSlug(collection, name, excludeId) {
  const base = slugify(name) || 'item';
  let slug = base;
  let suffix = 2;
  while (collection.some((doc) => doc.slug === slug && doc._id !== excludeId)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function readStatusFilter(request) {
  const status = getQuery(request).get('status');
  return PUBLISH_STATUSES.includes(status) ? status : null;
}

function isWholeNumber(value) {
  return typeof value === 'number' && Number.isInteger(value);
}

// ---------------------------------------------------------------------------
// Designations and domains (same shape and rules)
// ---------------------------------------------------------------------------

function catalogItemDto(doc) {
  return {
    _id: doc._id,
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? '',
    status: doc.status,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? doc.createdAt ?? null,
  };
}

function validateCatalogInput(body) {
  const name = cleanText(body?.name);
  const description = cleanMultiline(body?.description);
  const details = [];
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    details.push({
      field: 'name',
      message: `Enter a name between ${NAME_MIN} and ${NAME_MAX} characters.`,
    });
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    details.push({
      field: 'description',
      message: `Enter a description between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters.`,
    });
  }
  return { name, description, details };
}

/**
 * kind: { path, collection, entityType, actionPrefix, label }
 * e.g. '/admin/designations', 'designations', 'Designation', 'DESIGNATION', 'designation'
 */
function catalogRoutes({ path, collection, entityType, actionPrefix, label }) {
  const items = () => db[collection];
  const duplicateNameError = (name) =>
    conflict('DUPLICATE_NAME', `A ${label} with this name already exists.`, [
      { field: 'name', message: `A ${label} called “${name}” already exists. Choose a different name.` },
    ]);

  return [
    mock.get(path, ({ request }) => {
      const auth = requireAuth(request, ADMIN);
      if (auth.error) return auth.error;
      const query = getQuery(request);
      const search = query.get('search');
      const status = readStatusFilter(request);
      const rows = items()
        .filter((doc) => (status ? doc.status === status : true))
        .filter((doc) => matchesSearch(search, doc.name, doc.slug, doc.description))
        .map(catalogItemDto);
      return json(paginate(applySort(rows, request, 'name:asc'), request));
    }),

    mock.post(path, async ({ request }) => {
      const auth = requireAuth(request, ADMIN);
      if (auth.error) return auth.error;
      const body = await readJson(request);
      const { name, description, details } = validateCatalogInput(body);
      if (details.length) return validationError(details);
      if (items().some((doc) => sameName(doc.name, name))) return duplicateNameError(name);

      const now = nowIso();
      const doc = {
        _id: oid(),
        name,
        slug: uniqueSlug(items(), name),
        description,
        status: 'DRAFT',
        createdBy: auth.user._id,
        updatedBy: auth.user._id,
        createdAt: now,
        updatedAt: now,
      };
      items().push(doc);
      addAudit({
        actorId: auth.user._id,
        action: `${actionPrefix}_CREATED`,
        entityType,
        entityId: doc._id,
        before: null,
        after: catalogItemDto(doc),
      });
      return created(catalogItemDto(doc));
    }),

    mock.put(`${path}/:id`, async ({ request, params }) => {
      const auth = requireAuth(request, ADMIN);
      if (auth.error) return auth.error;
      const doc = byId(items(), params.id);
      if (!doc) return notFound(entityType);
      const body = await readJson(request);
      const { name, description, details } = validateCatalogInput(body);
      if (details.length) return validationError(details);
      if (items().some((other) => other._id !== doc._id && sameName(other.name, name))) {
        return duplicateNameError(name);
      }

      const before = catalogItemDto(doc);
      // Public links use the slug, so it only follows the name while the item is still a draft.
      if (doc.status === 'DRAFT' && !sameName(doc.name, name)) {
        doc.slug = uniqueSlug(items(), name, doc._id);
      }
      doc.name = name;
      doc.description = description;
      doc.updatedBy = auth.user._id;
      doc.updatedAt = nowIso();
      addAudit({
        actorId: auth.user._id,
        action: `${actionPrefix}_UPDATED`,
        entityType,
        entityId: doc._id,
        before,
        after: catalogItemDto(doc),
      });
      return json(catalogItemDto(doc));
    }),

    mock.patch(`${path}/:id/status`, async ({ request, params }) => {
      const auth = requireAuth(request, ADMIN);
      if (auth.error) return auth.error;
      const doc = byId(items(), params.id);
      if (!doc) return notFound(entityType);
      const body = await readJson(request);
      if (!PUBLISH_STATUSES.includes(body?.status)) {
        return validationError([{ field: 'status', message: 'Status must be DRAFT or PUBLISHED.' }]);
      }
      if (doc.status === body.status) return json(catalogItemDto(doc));

      const before = { status: doc.status };
      doc.status = body.status;
      doc.updatedBy = auth.user._id;
      doc.updatedAt = nowIso();
      addAudit({
        actorId: auth.user._id,
        action: `${actionPrefix}_${body.status === 'PUBLISHED' ? 'PUBLISHED' : 'UNPUBLISHED'}`,
        entityType,
        entityId: doc._id,
        before,
        after: { status: doc.status },
      });
      return json(catalogItemDto(doc));
    }),
  ];
}

// ---------------------------------------------------------------------------
// Internship plans and pricing
// ---------------------------------------------------------------------------

const PLAN_DEFAULT_ORDER = (a, b) =>
  String(a.designation?.name ?? '').localeCompare(String(b.designation?.name ?? '')) ||
  String(a.domain?.name ?? '').localeCompare(String(b.domain?.name ?? '')) ||
  Number(a.durationMonths) - Number(b.durationMonths);

function duplicatePlanError() {
  return conflict('DUPLICATE_PLAN', 'A plan for this designation, domain and duration already exists.');
}

function findDuplicatePlan({ designationId, domainId, durationMonths, excludeId }) {
  return db.internshipPlans.find(
    (plan) =>
      plan._id !== excludeId &&
      plan.designationId === designationId &&
      plan.domainId === domainId &&
      Number(plan.durationMonths) === Number(durationMonths),
  );
}

function validateBasePrice(value, details) {
  if (!isWholeNumber(value) || value <= 0) {
    // basePrice travels in integer paise; the message is written for the rupee field admins see.
    details.push({ field: 'basePrice', message: 'Enter a base price above ₹0.' });
  } else if (value > MAX_BASE_PRICE) {
    details.push({ field: 'basePrice', message: 'The base price can be at most ₹10,00,000.' });
  }
}

function validateDuration(value, details) {
  if (!DURATION_OPTIONS.includes(value)) {
    details.push({
      field: 'durationMonths',
      message: `Choose a duration of ${DURATION_OPTIONS.join(', ')} months.`,
    });
  }
}

function planAuditSnapshot(plan) {
  const domain = byId(db.domains, plan.domainId);
  return {
    basePrice: plan.basePrice,
    currency: plan.currency,
    durationMonths: plan.durationMonths,
    domainId: plan.domainId,
    domain: domain?.name ?? null,
  };
}

const planRoutes = [
  mock.get('/admin/internship-plans', ({ request }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const query = getQuery(request);
    const designationId = query.get('designationId');
    const domainId = query.get('domainId');
    const durationMonths = Number(query.get('durationMonths')) || null;
    const status = readStatusFilter(request);
    const search = query.get('search');

    let rows = db.internshipPlans
      .filter((plan) => (designationId ? plan.designationId === designationId : true))
      .filter((plan) => (domainId ? plan.domainId === domainId : true))
      .filter((plan) => (durationMonths ? Number(plan.durationMonths) === durationMonths : true))
      .filter((plan) => (status ? plan.status === status : true))
      .map((plan) => planDto(plan))
      .filter((plan) =>
        matchesSearch(search, plan.designation?.name, plan.domain?.name, `${plan.durationMonths} months`),
      );

    rows = query.get('sort') ? applySort(rows, request) : [...rows].sort(PLAN_DEFAULT_ORDER);
    return json(paginate(rows, request));
  }),

  mock.post('/admin/internship-plans', async ({ request }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const details = [];

    const designation = typeof body.designationId === 'string' ? byId(db.designations, body.designationId) : null;
    if (!designation) details.push({ field: 'designationId', message: 'Choose a designation.' });
    const domain = typeof body.domainId === 'string' ? byId(db.domains, body.domainId) : null;
    if (!domain) details.push({ field: 'domainId', message: 'Choose a domain.' });
    validateDuration(body.durationMonths, details);
    validateBasePrice(body.basePrice, details);
    const status = body.status === undefined || body.status === null ? 'DRAFT' : body.status;
    if (!PUBLISH_STATUSES.includes(status)) {
      details.push({ field: 'status', message: 'Status must be DRAFT or PUBLISHED.' });
    }
    if (details.length) return validationError(details);

    if (
      findDuplicatePlan({
        designationId: designation._id,
        domainId: domain._id,
        durationMonths: body.durationMonths,
      })
    ) {
      return duplicatePlanError();
    }

    const now = nowIso();
    const plan = {
      _id: oid(),
      designationId: designation._id,
      domainId: domain._id,
      durationMonths: body.durationMonths,
      basePrice: body.basePrice,
      currency: CURRENCY,
      status,
      createdBy: auth.user._id,
      updatedBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    };
    db.internshipPlans.push(plan);
    addAudit({
      actorId: auth.user._id,
      action: 'PLAN_CREATED',
      entityType: 'InternshipPlan',
      entityId: plan._id,
      before: null,
      after: planDto(plan),
    });
    return created(planDto(plan));
  }),

  mock.put('/admin/internship-plans/:id', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const plan = byId(db.internshipPlans, params.id);
    if (!plan) return notFound('Plan');
    const body = await readJson(request);
    const details = [];

    validateBasePrice(body.basePrice, details);
    const hasDuration = body.durationMonths !== undefined && body.durationMonths !== null;
    if (hasDuration) validateDuration(body.durationMonths, details);
    const hasDomain = body.domainId !== undefined && body.domainId !== null && body.domainId !== '';
    if (hasDomain && !(typeof body.domainId === 'string' && byId(db.domains, body.domainId))) {
      details.push({ field: 'domainId', message: 'Choose a domain.' });
    }
    if (details.length) return validationError(details);

    const nextDomainId = hasDomain ? body.domainId : plan.domainId;
    const nextDuration = hasDuration ? body.durationMonths : plan.durationMonths;
    if (
      findDuplicatePlan({
        designationId: plan.designationId,
        domainId: nextDomainId,
        durationMonths: nextDuration,
        excludeId: plan._id,
      })
    ) {
      return duplicatePlanError();
    }

    // Existing quotes and enrollments keep their own price snapshot: only new quotes see this.
    const before = planAuditSnapshot(plan);
    plan.basePrice = body.basePrice;
    plan.domainId = nextDomainId;
    plan.durationMonths = nextDuration;
    plan.updatedBy = auth.user._id;
    plan.updatedAt = nowIso();
    addAudit({
      actorId: auth.user._id,
      action: 'PRICE_UPDATED',
      entityType: 'InternshipPlan',
      entityId: plan._id,
      before,
      after: planAuditSnapshot(plan),
    });
    return json(planDto(plan));
  }),

  mock.patch('/admin/internship-plans/:id/status', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const plan = byId(db.internshipPlans, params.id);
    if (!plan) return notFound('Plan');
    const body = await readJson(request);
    if (!PUBLISH_STATUSES.includes(body?.status)) {
      return validationError([{ field: 'status', message: 'Status must be DRAFT or PUBLISHED.' }]);
    }
    if (plan.status === body.status) return json(planDto(plan));

    const before = { status: plan.status };
    plan.status = body.status;
    plan.updatedBy = auth.user._id;
    plan.updatedAt = nowIso();
    addAudit({
      actorId: auth.user._id,
      action: body.status === 'PUBLISHED' ? 'PLAN_PUBLISHED' : 'PLAN_UNPUBLISHED',
      entityType: 'InternshipPlan',
      entityId: plan._id,
      before,
      after: { status: plan.status },
    });
    return json(planDto(plan));
  }),
];

// ---------------------------------------------------------------------------
// Assessment configuration and discount slabs
// ---------------------------------------------------------------------------

function configsFor(designationId) {
  return db.assessmentConfigs.filter((config) => config.designationId === designationId);
}

function latestConfigFor(designationId) {
  return configsFor(designationId).reduce(
    (latest, config) => (!latest || Number(config.version) > Number(latest.version) ? config : latest),
    null,
  );
}

function publishedConfigFor(designationId) {
  return configsFor(designationId)
    .filter((config) => config.status === 'PUBLISHED')
    .reduce(
      (latest, config) => (!latest || Number(config.version) > Number(latest.version) ? config : latest),
      null,
    );
}

function normaliseOptions(options) {
  const list = Array.isArray(options) ? options : [];
  return Array.from({ length: ASSESSMENT_OPTION_COUNT }, (_, index) =>
    typeof list[index] === 'string' ? list[index] : '',
  );
}

function questionDto(question) {
  return {
    _id: question._id,
    text: question.text ?? '',
    options: normaliseOptions(question.options),
    correctIndex: Number.isInteger(question.correctIndex) ? question.correctIndex : null,
    marks: Number(question.marks) || 1,
  };
}

function slabDto(slab) {
  return {
    minScore: slab?.minScore ?? null,
    maxScore: slab?.maxScore ?? null,
    discountPercent: slab?.discountPercent ?? null,
  };
}

/** Admin view of a config: includes the answer keys (never sent to students). */
function adminConfigDto(config) {
  const designation = byId(db.designations, config.designationId);
  const published = publishedConfigFor(config.designationId);
  return {
    _id: config._id,
    designationId: config.designationId,
    designation: refOf(designation),
    version: config.version,
    status: config.status,
    publishedVersion: published ? published.version : null,
    questions: (Array.isArray(config.questions) ? config.questions : []).map(questionDto),
    discountSlabs: (Array.isArray(config.discountSlabs) ? config.discountSlabs : []).map(slabDto),
    updatedAt: config.updatedAt ?? config.createdAt ?? null,
  };
}

function configSummaryDto(designation) {
  const latest = latestConfigFor(designation._id);
  const published = publishedConfigFor(designation._id);
  return {
    designationId: designation._id,
    designation: refOf(designation),
    configId: latest ? latest._id : null,
    version: latest ? latest.version : null,
    status: latest ? latest.status : null,
    questionCount: latest && Array.isArray(latest.questions) ? latest.questions.length : 0,
    publishedVersion: published ? published.version : null,
    updatedAt: latest ? (latest.updatedAt ?? latest.createdAt ?? null) : null,
  };
}

const isNumberOrNull = (value) => value === null || (typeof value === 'number' && Number.isFinite(value));

/**
 * Drafts may be incomplete, so saving only checks the shape. The full rules (15 questions, one
 * correct answer each, slabs covering 0-15 without overlap) are enforced when publishing.
 */
function readDraftInput(body) {
  const details = [];
  const questions = [];
  const discountSlabs = [];

  if (!Array.isArray(body?.questions)) {
    details.push({ field: 'questions', message: 'Questions must be a list.' });
  } else if (body.questions.length > ASSESSMENT_QUESTION_COUNT) {
    details.push({
      field: 'questions',
      message: `An assessment has at most ${ASSESSMENT_QUESTION_COUNT} questions.`,
    });
  } else {
    body.questions.forEach((raw, index) => {
      const field = `questions[${index}]`;
      if (!raw || typeof raw !== 'object') {
        details.push({ field, message: `Question ${index + 1} is not valid.` });
        return;
      }
      const text = typeof raw.text === 'string' ? raw.text.trim() : null;
      if (text === null || text.length > QUESTION_TEXT_MAX) {
        details.push({
          field: `${field}.text`,
          message: `Question ${index + 1}: text must be at most ${QUESTION_TEXT_MAX} characters.`,
        });
      }
      const options = Array.isArray(raw.options) ? raw.options : null;
      if (
        !options ||
        options.length !== ASSESSMENT_OPTION_COUNT ||
        options.some((option) => typeof option !== 'string' || option.trim().length > OPTION_TEXT_MAX)
      ) {
        details.push({
          field: `${field}.options`,
          message: `Question ${index + 1}: give exactly ${ASSESSMENT_OPTION_COUNT} options of at most ${OPTION_TEXT_MAX} characters.`,
        });
      }
      const correctIndex = raw.correctIndex === undefined ? null : raw.correctIndex;
      if (
        correctIndex !== null &&
        !(Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < ASSESSMENT_OPTION_COUNT)
      ) {
        details.push({
          field: `${field}.correctIndex`,
          message: `Question ${index + 1}: the correct answer must be one of the ${ASSESSMENT_OPTION_COUNT} options.`,
        });
      }
      const existingId = typeof raw._id === 'string' && /^[a-f0-9]{24}$/i.test(raw._id) ? raw._id : null;
      questions.push({
        _id: existingId ?? oid(),
        text: text ?? '',
        options: options ? options.map((option) => (typeof option === 'string' ? option.trim() : '')) : [],
        correctIndex,
        marks: Number(raw.marks) > 0 ? Number(raw.marks) : 1,
      });
    });
  }

  if (!Array.isArray(body?.discountSlabs)) {
    details.push({ field: 'discountSlabs', message: 'Discount slabs must be a list.' });
  } else if (body.discountSlabs.length > MAX_SLABS) {
    details.push({ field: 'discountSlabs', message: `Use at most ${MAX_SLABS} discount slabs.` });
  } else {
    body.discountSlabs.forEach((raw, index) => {
      const slab = raw && typeof raw === 'object' ? raw : {};
      const values = {
        minScore: slab.minScore ?? null,
        maxScore: slab.maxScore ?? null,
        discountPercent: slab.discountPercent ?? null,
      };
      if (!Object.values(values).every(isNumberOrNull)) {
        details.push({
          field: `discountSlabs[${index}]`,
          message: `Slab ${index + 1}: scores and discount must be numbers.`,
        });
      }
      discountSlabs.push(values);
    });
  }

  // Keep question ids unique even if the client sent the same id twice.
  const seen = new Set();
  questions.forEach((question) => {
    if (seen.has(question._id)) question._id = oid();
    seen.add(question._id);
  });

  return { details, questions, discountSlabs };
}

const assessmentRoutes = [
  mock.get('/admin/assessments', ({ request }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const search = getQuery(request).get('search');
    const rows = db.designations
      .filter((designation) => matchesSearch(search, designation.name, designation.slug))
      .map(configSummaryDto)
      .sort((a, b) => String(a.designation?.name ?? '').localeCompare(String(b.designation?.name ?? '')));
    return json(paginate(rows, request, 100));
  }),

  mock.get('/admin/assessments/:designationId', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const designation = byId(db.designations, params.designationId);
    if (!designation) return notFound('Designation');
    const latest = latestConfigFor(designation._id);
    if (!latest) return notFound('Assessment');
    return json(adminConfigDto(latest));
  }),

  mock.put('/admin/assessments/:designationId', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const designation = byId(db.designations, params.designationId);
    if (!designation) return notFound('Designation');
    const body = await readJson(request);
    const { details, questions, discountSlabs } = readDraftInput(body);
    if (details.length) return validationError(details);

    const latest = latestConfigFor(designation._id);
    const previousSlabs = JSON.stringify((latest?.discountSlabs ?? []).map(slabDto));
    const now = nowIso();
    let config;
    let before = null;

    if (latest && latest.status === 'DRAFT') {
      before = { version: latest.version, status: latest.status, questionCount: latest.questions?.length ?? 0 };
      latest.questions = questions;
      latest.discountSlabs = discountSlabs;
      latest.updatedAt = now;
      config = latest;
    } else {
      // The published version stays live (and attempts keep their version); edits start a new draft.
      config = {
        _id: oid(),
        designationId: designation._id,
        version: (latest ? Number(latest.version) || 0 : 0) + 1,
        status: 'DRAFT',
        questions,
        discountSlabs,
        createdBy: auth.user._id,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      };
      db.assessmentConfigs.push(config);
    }

    addAudit({
      actorId: auth.user._id,
      action: 'ASSESSMENT_UPDATED',
      entityType: 'AssessmentConfig',
      entityId: config._id,
      before,
      after: { version: config.version, status: config.status, questionCount: questions.length },
    });
    const nextSlabs = JSON.stringify(discountSlabs.map(slabDto));
    if (nextSlabs !== previousSlabs) {
      addAudit({
        actorId: auth.user._id,
        action: 'SLABS_UPDATED',
        entityType: 'AssessmentConfig',
        entityId: config._id,
        before: { discountSlabs: JSON.parse(previousSlabs) },
        after: { discountSlabs: discountSlabs.map(slabDto) },
      });
    }
    return json(adminConfigDto(config));
  }),

  mock.patch('/admin/assessments/:designationId/publish', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN);
    if (auth.error) return auth.error;
    const designation = byId(db.designations, params.designationId);
    if (!designation) return notFound('Designation');
    const latest = latestConfigFor(designation._id);
    if (!latest) return notFound('Assessment');
    if (latest.status !== 'DRAFT') {
      return conflict(
        'INVALID_TRANSITION',
        `Version ${latest.version} is already published. Save a change to start a new draft.`,
      );
    }

    const details = [...(validateQuestions(latest.questions) || []), ...(validateSlabs(latest.discountSlabs) || [])];
    if (details.length) {
      return unprocessable('VALIDATION_ERROR', 'This assessment is not ready to publish yet.', details);
    }

    const now = nowIso();
    const previous = publishedConfigFor(designation._id);
    if (previous && previous._id !== latest._id) {
      previous.status = 'ARCHIVED';
      previous.updatedAt = now;
    }
    latest.status = 'PUBLISHED';
    latest.publishedAt = now;
    latest.updatedAt = now;
    addAudit({
      actorId: auth.user._id,
      action: 'ASSESSMENT_PUBLISHED',
      entityType: 'AssessmentConfig',
      entityId: latest._id,
      before: { version: latest.version, status: 'DRAFT', previousPublishedVersion: previous?.version ?? null },
      after: { version: latest.version, status: 'PUBLISHED' },
    });
    return json(adminConfigDto(latest));
  }),
];

// ---------------------------------------------------------------------------

export const adminCatalogHandlers = [
  ...catalogRoutes({
    path: '/admin/designations',
    collection: 'designations',
    entityType: 'Designation',
    actionPrefix: 'DESIGNATION',
    label: 'designation',
  }),
  ...catalogRoutes({
    path: '/admin/domains',
    collection: 'domains',
    entityType: 'Domain',
    actionPrefix: 'DOMAIN',
    label: 'domain',
  }),
  ...planRoutes,
  ...assessmentRoutes,
];

export default adminCatalogHandlers;
