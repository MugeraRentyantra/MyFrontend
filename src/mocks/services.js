/**
 * Mock API domain logic and DTO builders: the "backend brain" behind every MSW handler.
 *
 * Handlers (src/mocks/handlers/*.js) stay thin: they authenticate, read the input, call the
 * functions below and return DTOs. Business rules follow the backend tickets (MM5-MM15,
 * SD3-SD15) and every DTO follows docs/API_CONTRACT.md.
 *
 * Conventions
 * - find*() lookups return the raw document or undefined.
 * - *Dto() builders return contract shapes and never leak passwords, invite tokens or answer
 *   keys (the admin assessment shape includes answers only when asked to).
 * - Rule violations throw MockHttpError: `throw httpError(422, 'VALIDATION_ERROR', msg, details)`.
 *   The handler wrapper in mocks/utils.js turns it into the standard error envelope.
 * - Mutating functions change the shared `db` in place and return the raw document; the
 *   wrapper persists the database after every request.
 * - This module must not import ./utils (import cycle) and contains no JSX.
 */
import { db, oid, persist } from './db';
import {
  addDays,
  addHours,
  computePayable,
  daysAgo,
  daysFromNow,
  DEFAULT_SLABS,
  discountForScore,
  hoursAgo,
  hoursFromNow,
  minutesAgo,
  placeholderScreenshot,
  randomToken,
} from './seed/helpers';
import { createCertificatePdfDataUrl } from './pdf';
import {
  ACTIVE_ENROLLMENT_STATUSES,
  ASSESSMENT_MAX_SCORE,
  ASSESSMENT_OPTION_COUNT,
  ASSESSMENT_QUESTION_COUNT,
  buildPath,
  CERTIFICATE_STATUS,
  CHECK_STATUS,
  CURRENCY,
  DURATION_OPTIONS,
  EMAIL_STATUS,
  ENROLLMENT_STATUS,
  ENROLLMENT_TYPE,
  INVITE_EXPIRY_DAYS,
  MEMBER_STATUS,
  PASSWORD_MIN_LENGTH,
  paths,
  PAYMENT_STATUS,
  PUBLISH_STATUS,
  REVIEW_DECISION,
  REVIEW_STATUS,
  ROLES,
  ROUTES,
  SCHEDULE_STATUS,
  SUBMISSION_RULES,
  TASK_STATUS,
  TEAM_MAX_MEMBERS,
  TEAM_STATUS,
  USER_STATUS,
} from '@/shared/constants';

// Shared with the seed; re-exported so handlers have one import for domain helpers.
export {
  addDays,
  addHours,
  computePayable,
  createCertificatePdfDataUrl,
  daysAgo,
  daysFromNow,
  DEFAULT_SLABS,
  discountForScore,
  hoursAgo,
  hoursFromNow,
  minutesAgo,
  placeholderScreenshot,
};

// ===========================================================================
// Constants
// ===========================================================================

const DEFAULT_IP = '127.0.0.1';
const MERCHANT_NAME = 'Internship Portal';
const UNKNOWN_USER_NAME = 'Unknown user';
const QUOTE_TTL_HOURS = 24; // MM8: a quote is valid for 24 hours
const MIN_FEEDBACK_LENGTH = 10; // MM14: feedback is required unless approving
const MIN_TEAM_SIZE = 2; // SD11: minimum team size is still to be confirmed with the client
const PENDING_AUTO_SUCCESS_MS = 25 * 1000; // mock gateway: a pending payment settles after 25 s
const CERTIFICATE_EMAIL_DELAY_MS = 4 * 1000; // simulated email worker delay on resend
const DOWNLOAD_URL_TTL_MS = 5 * 60 * 1000; // SD14: short-lived download link
const MAX_INLINE_SCREENSHOT_BYTES = 400 * 1024; // bigger files become (unpersisted) object URLs
const MAX_PLAN_PRICE_PAISE = 100000000; // 10,00,000 rupees
const MAX_SCHEDULE_DAYS = 200;
const MAX_TASK_HOURS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export const AUTH_TOKEN_TYPE = Object.freeze({
  EMAIL_VERIFY: 'EMAIL_VERIFY',
  PASSWORD_RESET: 'PASSWORD_RESET',
});

// SD3: the verification link is valid for 24 hours, the reset link for 1 hour.
const AUTH_TOKEN_TTL_HOURS = Object.freeze({
  [AUTH_TOKEN_TYPE.EMAIL_VERIFY]: 24,
  [AUTH_TOKEN_TYPE.PASSWORD_RESET]: 1,
});

/** SD2 email templates. */
export const EMAIL_TEMPLATES = Object.freeze({
  VERIFY_EMAIL: 'verify-email',
  RESET_PASSWORD: 'reset-password',
  TEAM_INVITE: 'team-invite',
  PAYMENT_SUCCESS: 'payment-success',
  CERTIFICATE: 'certificate',
});

/** Outcomes accepted by POST /payments/mock/complete. */
export const PAYMENT_OUTCOMES = Object.freeze(['success', 'failure', 'pending']);

export const PAYMENT_EVENT_TYPES = Object.freeze({
  ORDER_CREATED: 'order.created',
  PENDING: 'payment.pending',
  AUTHORIZED: 'payment.authorized',
  CAPTURED: 'payment.captured',
  FAILED: 'payment.failed',
  FLAGGED: 'payment.flagged',
});

const PAYMENT_EVENT_NOTES = Object.freeze({
  [PAYMENT_EVENT_TYPES.ORDER_CREATED]: 'Order created with the payment gateway.',
  [PAYMENT_EVENT_TYPES.PENDING]: 'Waiting for the bank to confirm the payment.',
  [PAYMENT_EVENT_TYPES.AUTHORIZED]: 'Payment authorised by the bank.',
  [PAYMENT_EVENT_TYPES.CAPTURED]: 'Payment captured. Webhook signature verified.',
  [PAYMENT_EVENT_TYPES.FAILED]: 'Payment failed at the gateway.',
  [PAYMENT_EVENT_TYPES.FLAGGED]: 'Payment flagged for review.',
});

/** Enrollment statuses in which a student works on tasks. */
const LEARNING_STATUSES = [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.IN_PROGRESS];
/** MM12: a task can be submitted from these states. */
const SUBMITTABLE_STATUSES = [
  TASK_STATUS.AVAILABLE,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.CHANGES_REQUESTED,
];
/** Payment states the (mock) gateway may still change. */
const OPEN_PAYMENT_STATUSES = [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING];
/** Team members holding a seat (SD10 counts these towards the maximum of 5). */
const SEAT_MEMBER_STATUSES = [MEMBER_STATUS.INVITED, MEMBER_STATUS.JOINED];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GITHUB_URL_RE = /^https:\/\/github\.com\/[^\s/]+/;

// ===========================================================================
// Errors
// ===========================================================================

/**
 * Error carrying an HTTP status and an API error code. Thrown from domain logic; the mock
 * handler wrapper converts any thrown object with a numeric `status` and a string `code`
 * into `{ success: false, error: { code, message, details } }`.
 */
export class MockHttpError extends Error {
  constructor(status, code, message, details = []) {
    super(message || 'Request failed.');
    this.name = 'MockHttpError';
    this.status = status;
    this.code = code;
    this.details = Array.isArray(details) ? details : [];
  }
}

/** throw httpError(422, 'VALIDATION_ERROR', 'Please check the highlighted fields.', [{ field, message }]) */
export function httpError(status, code, message, details = []) {
  return new MockHttpError(status, code, message, details);
}

export function fieldError(field, message) {
  return { field, message };
}

export function notFoundError(what = 'Resource') {
  return httpError(404, 'NOT_FOUND', `${what} not found.`);
}

export function forbiddenError(message = "You don't have permission to do this.", code = 'FORBIDDEN') {
  return httpError(403, code, message);
}

export function unauthenticatedError(message = 'Please log in to continue.') {
  return httpError(401, 'UNAUTHENTICATED', message);
}

export function validationFailure(details, message = 'Please check the highlighted fields.') {
  return httpError(422, 'VALIDATION_ERROR', message, details);
}

export function invalidTransition(message = 'This action is not allowed right now.') {
  return httpError(409, 'INVALID_TRANSITION', message);
}

// ===========================================================================
// Small helpers: time, ids, collections, validation primitives
// ===========================================================================

export function nowIso() {
  return new Date().toISOString();
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isExpired(iso, now = Date.now()) {
  return Boolean(iso) && toTime(iso) <= now;
}

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const LOWER_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789';
const HEX = '0123456789abcdef';

function randomString(length, alphabet = ALPHANUMERIC) {
  const cryptoApi = globalThis.crypto;
  let output = '';
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(length));
    for (let index = 0; index < length; index += 1) output += alphabet[bytes[index] % alphabet.length];
    return output;
  }
  for (let index = 0; index < length; index += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

/** Opaque random token. makeToken('inv') -> "inv-<24 random chars>" */
export function makeToken(prefix) {
  return prefix ? randomToken(prefix) : randomString(24, LOWER_ALPHANUMERIC);
}

function makeUuid() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  const hex = randomString(32, HEX);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function byId(collection, id) {
  if (!id || !Array.isArray(collection)) return undefined;
  const key = String(id);
  return collection.find((doc) => doc._id === key);
}

/** The item with the latest timestamp in `field` (ties: the one stored last). */
function latestBy(items, field) {
  let best = null;
  (items || []).forEach((item) => {
    if (!best || toTime(item?.[field]) >= toTime(best[field])) best = item;
  });
  return best;
}

function sortByTime(items, field, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...(items || [])].sort((a, b) => (toTime(a?.[field]) - toTime(b?.[field])) * factor);
}

/** Deep copy for audit before/after values (so later edits never change history). */
function snapshot(value) {
  if (value === undefined || value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

export function isValidEmailAddress(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

function userHasRole(user, role) {
  return Array.isArray(user?.roles) && user.roles.includes(role);
}

function isBlank(value) {
  return value === null || value === undefined || value === '' || typeof value === 'boolean';
}

function isIntegerInRange(value, min, max) {
  if (isBlank(value)) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function isNumberInRange(value, min, max) {
  if (isBlank(value)) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function toNumberOrNull(value) {
  if (isBlank(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map(String))];
}

function pluralWord(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural;
}

function formatRupees(paise) {
  const rupees = Number(paise || 0) / 100;
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** [0, 1, 2, 3, 9] -> "0–3, 9" */
function formatRanges(numbers) {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const parts = [];
  let start = null;
  let previous = null;
  const flush = () => {
    if (start !== null) parts.push(start === previous ? `${start}` : `${start}–${previous}`);
  };
  sorted.forEach((value) => {
    if (start !== null && value === previous + 1) {
      previous = value;
      return;
    }
    flush();
    start = value;
    previous = value;
  });
  flush();
  return parts.join(', ');
}

/** Runs a simulated background job later, then persists the mock DB. */
function runLater(job, delayMs) {
  const timer = setTimeout(() => {
    try {
      job();
      persist();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[mock api] background job failed', error);
    }
  }, delayMs);
  // Never keep a Node test process alive for a simulated job.
  if (timer && typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
  return timer;
}

// ===========================================================================
// Lookups (raw documents or undefined)
// ===========================================================================

export function findUser(id) {
  return byId(db.users, id);
}

/** Case-insensitive email lookup. */
export function findUserByEmail(email) {
  const needle = normalizeEmail(email);
  if (!needle) return undefined;
  return db.users.find((user) => normalizeEmail(user.email) === needle);
}

function findCatalogItem(collection, idOrSlug) {
  if (!idOrSlug) return undefined;
  const key = String(idOrSlug).trim();
  return (
    collection.find((item) => item._id === key) ??
    collection.find((item) => String(item.slug ?? '').toLowerCase() === key.toLowerCase())
  );
}

/** Accepts an id or a slug. */
export function findDesignation(idOrSlug) {
  return findCatalogItem(db.designations, idOrSlug);
}

/** Accepts an id or a slug. */
export function findDomain(idOrSlug) {
  return findCatalogItem(db.domains, idOrSlug);
}

export function findPlan(id) {
  return byId(db.internshipPlans, id);
}

export function findEnrollment(id) {
  return byId(db.enrollments, id);
}

export function findTeam(id) {
  return byId(db.teams, id);
}

export function findTeamMember(id) {
  return byId(db.teamMembers, id);
}

/** Schedule template (one document per version). */
export function findTemplate(id) {
  return byId(db.scheduleTemplates, id);
}

export function findTaskDefinition(id) {
  return byId(db.taskDefinitions, id);
}

export function findProgress(id) {
  return byId(db.taskProgress, id);
}

export function findSubmission(id) {
  return byId(db.taskSubmissions, id);
}

export function findPayment(id) {
  return byId(db.payments, id);
}

export function findPaymentByOrderId(orderId) {
  if (!orderId) return undefined;
  const key = String(orderId).trim();
  return db.payments.find((payment) => payment.orderId === key);
}

export function findQuote(id) {
  return byId(db.quotes, id);
}

export function findAssessmentConfig(id) {
  return byId(db.assessmentConfigs, id);
}

export function findAssignment(id) {
  return byId(db.trainerAssignments, id);
}

/** Accepts the certificate _id or its number (case-insensitive), e.g. "IP-2026-000123". */
export function findCertificate(idOrNo) {
  if (!idOrNo) return undefined;
  const key = String(idOrNo).trim();
  return (
    db.certificates.find((certificate) => certificate._id === key) ??
    db.certificates.find(
      (certificate) => String(certificate.certificateNo ?? '').toUpperCase() === key.toUpperCase(),
    )
  );
}

export function findInviteByToken(token) {
  if (!token) return undefined;
  const key = String(token).trim();
  return db.teamMembers.find((member) => Boolean(member.inviteToken) && member.inviteToken === key);
}

export function findGithubConnection(userId) {
  if (!userId) return undefined;
  return db.githubConnections.find((connection) => connection.userId === userId);
}

// ===========================================================================
// Reference DTOs: users, catalog, plans
// ===========================================================================

/** User { _id, name, email, roles[], status, emailVerified, createdAt, updatedAt } (never the password). */
export function publicUser(user) {
  if (!user) return null;
  return {
    _id: user._id,
    name: user.name ?? '',
    email: user.email ?? '',
    roles: Array.isArray(user.roles) ? [...user.roles] : [],
    status: user.status ?? USER_STATUS.ACTIVE,
    emailVerified: Boolean(user.emailVerified),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  };
}

/** { _id, name, email } or null. */
export function userRef(userOrId) {
  if (!userOrId) return null;
  const user = typeof userOrId === 'object' ? userOrId : findUser(userOrId);
  if (!user) return { _id: String(userOrId), name: UNKNOWN_USER_NAME, email: null };
  return { _id: user._id, name: user.name ?? '', email: user.email ?? null };
}

/** { _id, name } or null (used where the contract shows a person without an email). */
export function nameRef(userOrId) {
  const ref = userRef(userOrId);
  return ref ? { _id: ref._id, name: ref.name } : null;
}

function catalogRef(item) {
  return item ? { _id: item._id, name: item.name, slug: item.slug } : null;
}

/** DesignationRef { _id, name, slug } from a document, id or slug. */
export function designationRef(designationOrId) {
  if (!designationOrId) return null;
  return catalogRef(
    typeof designationOrId === 'object' ? designationOrId : findDesignation(designationOrId),
  );
}

/** DomainRef { _id, name, slug } from a document, id or slug. */
export function domainRef(domainOrId) {
  if (!domainOrId) return null;
  return catalogRef(typeof domainOrId === 'object' ? domainOrId : findDomain(domainOrId));
}

/** Designation / Domain { _id, name, slug, description, status, createdAt, updatedAt } */
export function catalogItemDto(item) {
  if (!item) return null;
  return {
    _id: item._id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? '',
    status: item.status,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

export const designationDto = catalogItemDto;
export const domainDto = catalogItemDto;

function resolvePlan(planOrId) {
  if (!planOrId) return null;
  return typeof planOrId === 'object' ? planOrId : (findPlan(planOrId) ?? null);
}

/** Plan (public and admin shape). */
export function planDto(plan) {
  if (!plan) return null;
  return {
    _id: plan._id,
    designationId: plan.designationId,
    domainId: plan.domainId,
    durationMonths: plan.durationMonths,
    basePrice: plan.basePrice,
    currency: plan.currency || CURRENCY,
    status: plan.status,
    designation: designationRef(plan.designationId),
    domain: domainRef(plan.domainId),
    createdAt: plan.createdAt ?? null,
    updatedAt: plan.updatedAt ?? null,
  };
}

/** PlanRef { _id, durationMonths, basePrice, currency, designation, domain } */
export function planRef(planOrId) {
  const plan = resolvePlan(planOrId);
  if (!plan) return null;
  return {
    _id: plan._id,
    durationMonths: plan.durationMonths,
    basePrice: plan.basePrice,
    currency: plan.currency || CURRENCY,
    designation: designationRef(plan.designationId),
    domain: domainRef(plan.domainId),
  };
}

/** "Java Developer · Banking · 3 months" */
function planLabel(planOrId) {
  const ref = planRef(planOrId);
  if (!ref) return 'Internship';
  const months = Number(ref.durationMonths) || 0;
  const parts = [
    ref.designation?.name,
    ref.domain?.name,
    months ? `${months} ${pluralWord(months, 'month')}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Internship';
}

function planTemplateKey(plan) {
  return {
    designationId: plan.designationId,
    domainId: plan.domainId,
    durationMonths: plan.durationMonths,
  };
}

// ===========================================================================
// Assessment (MM6, MM7) and price quotes (MM8)
// ===========================================================================

function resolveDesignationId(idOrSlug) {
  if (!idOrSlug) return null;
  return findDesignation(idOrSlug)?._id ?? String(idOrSlug);
}

function configsFor(designationId) {
  const id = resolveDesignationId(designationId);
  return id ? db.assessmentConfigs.filter((config) => config.designationId === id) : [];
}

function highestVersion(items) {
  return items.reduce(
    (best, item) => (!best || Number(item.version) > Number(best.version) ? item : best),
    null,
  );
}

/** Latest PUBLISHED assessment config of a designation (or null). */
export function getPublishedAssessmentConfig(designationId) {
  return highestVersion(
    configsFor(designationId).filter((config) => config.status === SCHEDULE_STATUS.PUBLISHED),
  );
}

/** Highest-version assessment config in any status (or null). */
export function getLatestAssessmentConfig(designationId) {
  return highestVersion(configsFor(designationId));
}

function publishedVersionOf(designationId) {
  return getPublishedAssessmentConfig(designationId)?.version ?? null;
}

/**
 * MM7: the score is computed on the server only. Unanswered or unknown answers count as
 * wrong; each question is worth `marks` (default 1). Result is clamped to 0..15.
 */
export function scoreAnswers(config, answers) {
  if (!config || !Array.isArray(config.questions)) return 0;
  const selected = new Map();
  (Array.isArray(answers) ? answers : []).forEach((answer) => {
    if (answer && answer.questionId !== undefined && answer.questionId !== null) {
      selected.set(String(answer.questionId), answer.selectedIndex);
    }
  });
  const lastOption = ASSESSMENT_OPTION_COUNT - 1;
  const score = config.questions.reduce((total, question) => {
    const choice = selected.get(String(question._id));
    const correct =
      isIntegerInRange(choice, 0, lastOption) &&
      isIntegerInRange(question.correctIndex, 0, lastOption) &&
      Number(choice) === Number(question.correctIndex);
    if (!correct) return total;
    const marks = Number(question.marks);
    return total + (Number.isFinite(marks) && marks > 0 ? marks : 1);
  }, 0);
  return Math.max(0, Math.min(ASSESSMENT_MAX_SCORE, score));
}

/** One stored answer per question of the config (null = unanswered). */
function normalizeAnswers(config, answers) {
  const selected = new Map();
  (Array.isArray(answers) ? answers : []).forEach((answer) => {
    if (answer && answer.questionId !== undefined && answer.questionId !== null) {
      selected.set(String(answer.questionId), answer.selectedIndex);
    }
  });
  return (config.questions || []).map((question) => {
    const choice = selected.get(String(question._id));
    return {
      questionId: question._id,
      selectedIndex: isIntegerInRange(choice, 0, ASSESSMENT_OPTION_COUNT - 1) ? Number(choice) : null,
    };
  });
}

/**
 * MM6 publish rule for questions: exactly 15, each with text, exactly 4 non-empty distinct
 * options and a correctIndex of 0-3. Returns details[] (field paths match react-hook-form).
 */
export function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [fieldError('questions', `Add exactly ${ASSESSMENT_QUESTION_COUNT} questions.`)];
  }
  const details = [];
  if (questions.length !== ASSESSMENT_QUESTION_COUNT) {
    details.push(
      fieldError(
        'questions',
        `Add exactly ${ASSESSMENT_QUESTION_COUNT} questions (currently ${questions.length}).`,
      ),
    );
  }
  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    if (!String(question?.text ?? '').trim()) {
      details.push(fieldError(`questions.${index}.text`, `${label} needs text.`));
    }
    const options = Array.isArray(question?.options)
      ? question.options.map((option) => String(option ?? '').trim())
      : [];
    if (options.length !== ASSESSMENT_OPTION_COUNT) {
      details.push(
        fieldError(
          `questions.${index}.options`,
          `${label} needs exactly ${ASSESSMENT_OPTION_COUNT} options.`,
        ),
      );
    } else if (options.some((option) => !option)) {
      details.push(fieldError(`questions.${index}.options`, `${label} has an empty option.`));
    } else if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
      details.push(fieldError(`questions.${index}.options`, `${label} has duplicate options.`));
    }
    if (!isIntegerInRange(question?.correctIndex, 0, ASSESSMENT_OPTION_COUNT - 1)) {
      details.push(
        fieldError(`questions.${index}.correctIndex`, `Mark the correct answer for question ${index + 1}.`),
      );
    }
  });
  return details;
}

/**
 * MM6 slab rule: whole-number scores with 0 <= min <= max <= 15, discount 0-100, no overlaps
 * and every score from 0 to 15 covered. Returns details[].
 */
export function validateSlabs(slabs) {
  if (!Array.isArray(slabs) || slabs.length === 0) {
    return [fieldError('discountSlabs', 'Add at least one discount slab.')];
  }
  const details = [];
  slabs.forEach((slab, index) => {
    const label = `Slab ${index + 1}`;
    const minValid = isIntegerInRange(slab?.minScore, 0, ASSESSMENT_MAX_SCORE);
    const maxValid = isIntegerInRange(slab?.maxScore, 0, ASSESSMENT_MAX_SCORE);
    if (!minValid) {
      details.push(
        fieldError(
          `discountSlabs.${index}.minScore`,
          `${label}: the minimum score must be a whole number from 0 to ${ASSESSMENT_MAX_SCORE}.`,
        ),
      );
    }
    if (!maxValid) {
      details.push(
        fieldError(
          `discountSlabs.${index}.maxScore`,
          `${label}: the maximum score must be a whole number from 0 to ${ASSESSMENT_MAX_SCORE}.`,
        ),
      );
    }
    if (minValid && maxValid && Number(slab.minScore) > Number(slab.maxScore)) {
      details.push(
        fieldError(
          `discountSlabs.${index}.maxScore`,
          `${label}: the maximum score can't be lower than the minimum.`,
        ),
      );
    }
    if (!isNumberInRange(slab?.discountPercent, 0, 100)) {
      details.push(
        fieldError(
          `discountSlabs.${index}.discountPercent`,
          `${label}: the discount must be between 0 and 100%.`,
        ),
      );
    }
  });
  if (details.length > 0) return details;

  const ranges = slabs
    .map((slab) => ({ min: Number(slab.minScore), max: Number(slab.maxScore) }))
    .sort((a, b) => a.min - b.min);
  let widest = ranges[0];
  for (let index = 1; index < ranges.length; index += 1) {
    const current = ranges[index];
    if (current.min <= widest.max) {
      details.push(
        fieldError(
          'discountSlabs',
          `Slabs ${widest.min}–${widest.max} and ${current.min}–${current.max} overlap.`,
        ),
      );
    }
    if (current.max > widest.max) widest = current;
  }
  const missing = [];
  for (let score = 0; score <= ASSESSMENT_MAX_SCORE; score += 1) {
    if (!ranges.some((range) => score >= range.min && score <= range.max)) missing.push(score);
  }
  if (missing.length > 0) {
    details.push(
      fieldError(
        'discountSlabs',
        missing.length === 1
          ? `Score ${missing[0]} is not covered by any slab.`
          : `Scores ${formatRanges(missing)} are not covered by any slab.`,
      ),
    );
  }
  return details;
}

export function findAttempt(userId, designationId) {
  if (!userId || !designationId) return undefined;
  const id = resolveDesignationId(designationId);
  return db.assessmentAttempts.find(
    (attempt) => attempt.userId === userId && attempt.designationId === id,
  );
}

/** A student's attempts, newest first. */
export function attemptsForUser(userId) {
  if (!userId) return [];
  return sortByTime(
    db.assessmentAttempts.filter((attempt) => attempt.userId === userId),
    'submittedAt',
    'desc',
  );
}

/** Attempt { _id, designationId, configVersion, score, totalQuestions, discountPercent, submittedAt, designation } */
export function attemptDto(attempt) {
  if (!attempt) return null;
  return {
    _id: attempt._id,
    designationId: attempt.designationId,
    configVersion: attempt.configVersion ?? null,
    score: Number(attempt.score) || 0,
    totalQuestions: attempt.totalQuestions ?? ASSESSMENT_QUESTION_COUNT,
    discountPercent: Number(attempt.discountPercent) || 0,
    submittedAt: attempt.submittedAt ?? null,
    designation: designationRef(attempt.designationId),
  };
}

/** GET /assessments/:designationId body: questions without answer keys. */
export function studentAssessmentDto(config) {
  if (!config) return null;
  const questions = (config.questions || []).map((question) => ({
    _id: question._id,
    text: question.text ?? '',
    options: Array.isArray(question.options) ? [...question.options] : [],
  }));
  return {
    designation: designationRef(config.designationId),
    configVersion: config.version,
    totalQuestions: questions.length,
    questions,
  };
}

/** Student view of the published assessment. 409 ALREADY_ATTEMPTED once taken (MM7). */
export function getAssessmentForStudent({ user, designationId }) {
  const designation = findDesignation(designationId);
  if (!designation) throw notFoundError('Designation');
  if (user && findAttempt(user._id, designation._id)) {
    throw httpError(409, 'ALREADY_ATTEMPTED', 'You have already taken this assessment. Your score is saved.');
  }
  const config = getPublishedAssessmentConfig(designation._id);
  if (!config) throw notFoundError('Assessment');
  return studentAssessmentDto(config);
}

/** MM7: scores the answers against the published config and stores the one allowed attempt. */
export function createAttempt({ user, designationId, answers }) {
  if (!user) throw unauthenticatedError();
  const designation = findDesignation(designationId);
  if (!designation) throw notFoundError('Designation');
  // MM7: one attempt per student and designation (admin-approved retakes are out of scope).
  if (findAttempt(user._id, designation._id)) {
    throw httpError(409, 'ALREADY_ATTEMPTED', 'You have already taken this assessment. Your score is saved.');
  }
  if (answers !== undefined && answers !== null && !Array.isArray(answers)) {
    throw validationFailure([fieldError('answers', 'Answers must be a list.')]);
  }
  const config = getPublishedAssessmentConfig(designation._id);
  if (!config) throw notFoundError('Assessment');

  // Any score sent by the browser is ignored; there is no pass mark (every score continues).
  const score = scoreAnswers(config, answers);
  const attempt = {
    _id: oid(),
    userId: user._id,
    designationId: designation._id,
    configVersion: config.version,
    answers: normalizeAnswers(config, answers),
    score,
    totalQuestions: ASSESSMENT_QUESTION_COUNT,
    discountPercent: discountForScore(config.discountSlabs || [], score),
    submittedAt: nowIso(),
  };
  db.assessmentAttempts.push(attempt);
  return attempt;
}

/**
 * Admin assessment shape: { _id, designationId, designation, version, status, publishedVersion,
 * questions, discountSlabs, updatedAt }. Answer keys only with { includeAnswers: true }.
 */
export function assessmentConfigDto(config, { includeAnswers = false } = {}) {
  if (!config) return null;
  return {
    _id: config._id,
    designationId: config.designationId,
    designation: designationRef(config.designationId),
    version: config.version,
    status: config.status,
    publishedVersion: publishedVersionOf(config.designationId),
    questions: (config.questions || []).map((question) => {
      const marks = Number(question.marks);
      const base = {
        _id: question._id,
        text: question.text ?? '',
        options: Array.isArray(question.options) ? [...question.options] : [],
        marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
      };
      return includeAnswers ? { ...base, correctIndex: question.correctIndex ?? null } : base;
    }),
    discountSlabs: (config.discountSlabs || []).map((slab) => ({
      minScore: slab.minScore,
      maxScore: slab.maxScore,
      discountPercent: slab.discountPercent,
    })),
    updatedAt: config.updatedAt ?? config.createdAt ?? null,
  };
}

/** GET /admin/assessments row: { designationId, designation, configId, version, status, questionCount, publishedVersion, updatedAt } */
export function assessmentSummaryDto(designationOrId) {
  const designation =
    designationOrId && typeof designationOrId === 'object'
      ? designationOrId
      : findDesignation(designationOrId);
  if (!designation) return null;
  const latest = getLatestAssessmentConfig(designation._id);
  return {
    designationId: designation._id,
    designation: catalogRef(designation),
    configId: latest?._id ?? null,
    version: latest?.version ?? null,
    status: latest?.status ?? null,
    questionCount: Array.isArray(latest?.questions) ? latest.questions.length : 0,
    publishedVersion: publishedVersionOf(designation._id),
    updatedAt: latest?.updatedAt ?? latest?.createdAt ?? null,
  };
}

/** Quote { quoteId, planId, enrollmentType, teamId, attemptId, score, basePrice, discountPercent, payableAmount, currency, expiresAt, createdAt } */
export function quoteDto(quote) {
  if (!quote) return null;
  const attempt = byId(db.assessmentAttempts, quote.attemptId);
  return {
    quoteId: quote._id,
    planId: quote.planId,
    enrollmentType: quote.enrollmentType,
    teamId: quote.teamId ?? null,
    attemptId: quote.attemptId ?? null,
    score: attempt ? Number(attempt.score) || 0 : null,
    basePrice: quote.basePrice,
    discountPercent: quote.discountPercent,
    payableAmount: quote.payableAmount,
    currency: quote.currency || CURRENCY,
    expiresAt: quote.expiresAt,
    createdAt: quote.createdAt,
  };
}

/**
 * MM8: price quote snapshot. Requires an assessment attempt for the plan's designation (any
 * score). Individual: the attempt's discount. Team: always 0% (SD11). Valid for 24 hours.
 */
export function createQuote({ user, planId, teamId }) {
  if (!user) throw unauthenticatedError();
  const plan = findPlan(planId);
  if (!plan || plan.status !== PUBLISH_STATUS.PUBLISHED) throw notFoundError('Plan');
  const attempt = findAttempt(user._id, plan.designationId);
  if (!attempt) {
    throw httpError(422, 'ASSESSMENT_REQUIRED', 'Take the assessment before getting a quote.');
  }

  let team = null;
  if (teamId) {
    team = findTeam(teamId);
    if (!team) throw notFoundError('Team');
    if (!isTeamMember(team, user._id)) {
      throw forbiddenError('Join this team before requesting a team quote.');
    }
    if (team.status === TEAM_STATUS.DISBANDED) throw invalidTransition('This team has been disbanded.');
    if (team.planId !== plan._id) {
      throw validationFailure([fieldError('planId', "This plan doesn't match your team's plan.")]);
    }
  }

  // MM8: team quotes are always 0%, whatever the member's score.
  const discountPercent = team ? 0 : Number(attempt.discountPercent) || 0;
  const now = nowIso();
  const quote = {
    _id: oid(),
    userId: user._id,
    planId: plan._id,
    enrollmentType: team ? ENROLLMENT_TYPE.TEAM : ENROLLMENT_TYPE.INDIVIDUAL,
    teamId: team?._id ?? null,
    attemptId: attempt._id,
    basePrice: plan.basePrice,
    discountPercent,
    payableAmount: computePayable(plan.basePrice, discountPercent),
    currency: plan.currency || CURRENCY,
    expiresAt: addHours(now, QUOTE_TTL_HOURS),
    createdAt: now,
  };
  db.quotes.push(quote);
  return quote;
}

// ===========================================================================
// Terms (SD5), enrollments (SD6) and payments (SD7, SD8)
// ===========================================================================

/** Highest terms version (or null). */
export function getLatestTerms() {
  return db.termsVersions.reduce(
    (best, terms) => (!best || Number(terms.version) > Number(best.version) ? terms : best),
    null,
  );
}

/** GET /terms/latest: { version, content, publishedAt } */
export function termsDto(terms) {
  if (!terms) return null;
  return { version: terms.version, content: terms.content ?? '', publishedAt: terms.publishedAt ?? null };
}

export function hasAcceptedTerms(enrollmentId, version) {
  if (!enrollmentId) return false;
  return db.termsAcceptances.some(
    (acceptance) =>
      acceptance.enrollmentId === enrollmentId && Number(acceptance.termsVersion) === Number(version),
  );
}

function acceptedTermsVersion(enrollmentId) {
  return db.termsAcceptances
    .filter((acceptance) => acceptance.enrollmentId === enrollmentId)
    .reduce((highest, acceptance) => {
      const version = Number(acceptance.termsVersion);
      return highest === null || version > highest ? version : highest;
    }, null);
}

/** POST /terms/accept body: { _id, enrollmentId, termsVersion, acceptedAt } */
export function termsAcceptanceDto(acceptance) {
  if (!acceptance) return null;
  return {
    _id: acceptance._id,
    enrollmentId: acceptance.enrollmentId,
    termsVersion: acceptance.termsVersion,
    acceptedAt: acceptance.acceptedAt,
  };
}

/**
 * SD5: records acceptance of the LATEST terms for one of the user's enrollments. Records are
 * append-only; accepting the same version again returns the existing record.
 */
export function acceptTerms({ user, enrollmentId, termsVersion, ip = DEFAULT_IP }) {
  if (!user) throw unauthenticatedError();
  const enrollment = findEnrollment(enrollmentId);
  if (!enrollment) throw notFoundError('Enrollment');
  if (enrollment.userId !== user._id) throw forbiddenError();
  if (isBlank(termsVersion)) {
    throw validationFailure([fieldError('termsVersion', 'Accept the terms to continue.')]);
  }
  const latest = getLatestTerms();
  if (!latest) throw notFoundError('Terms');
  if (Number(termsVersion) !== Number(latest.version)) {
    const message = `The terms were updated to version ${latest.version}. Please read them and accept again.`;
    throw httpError(409, 'TERMS_OUTDATED', message, [fieldError('termsVersion', message)]);
  }
  const existing = db.termsAcceptances.find(
    (acceptance) =>
      acceptance.enrollmentId === enrollment._id &&
      Number(acceptance.termsVersion) === Number(latest.version),
  );
  if (existing) return existing;
  const acceptance = {
    _id: oid(),
    userId: user._id,
    enrollmentId: enrollment._id,
    termsVersion: latest.version,
    acceptedAt: nowIso(),
    ip,
  };
  db.termsAcceptances.push(acceptance);
  return acceptance;
}

/**
 * MM9: new enrollments get the latest PUBLISHED template for the exact designation, domain and
 * duration; falls back to the latest published one for the designation, then any published one.
 */
export function getLatestPublishedTemplate({ designationId, domainId, durationMonths } = {}) {
  const published = db.scheduleTemplates.filter(
    (template) => template.status === SCHEDULE_STATUS.PUBLISHED,
  );
  const latest = (list) =>
    list.reduce((best, template) => {
      if (!best) return template;
      const byVersion = Number(template.version) - Number(best.version);
      if (byVersion !== 0) return byVersion > 0 ? template : best;
      return toTime(template.publishedAt) >= toTime(best.publishedAt) ? template : best;
    }, null);
  const exact = published.filter(
    (template) =>
      template.designationId === designationId &&
      template.domainId === domainId &&
      Number(template.durationMonths) === Number(durationMonths),
  );
  const sameDesignation = published.filter((template) => template.designationId === designationId);
  return latest(exact) ?? latest(sameDesignation) ?? latest(published);
}

/** Makes sure the enrollment points at a schedule template; returns the template or null. */
function ensureTemplateAssigned(enrollment) {
  if (!enrollment) return null;
  const current = findTemplate(enrollment.scheduleTemplateId);
  if (current) return current;
  const plan = findPlan(enrollment.planId);
  const template = plan ? getLatestPublishedTemplate(planTemplateKey(plan)) : null;
  if (template) {
    enrollment.scheduleTemplateId = template._id;
    enrollment.scheduleVersion = template.version;
  }
  return template;
}

/** A student's enrollments, newest first. */
export function enrollmentsForUser(userId) {
  if (!userId) return [];
  return sortByTime(
    db.enrollments.filter((enrollment) => enrollment.userId === userId),
    'createdAt',
    'desc',
  );
}

function snapshotFromQuote(quote) {
  return {
    basePrice: quote.basePrice,
    discountPercent: quote.discountPercent,
    payableAmount: quote.payableAmount,
    currency: quote.currency || CURRENCY,
  };
}

/**
 * SD6: creates a PENDING_PAYMENT enrollment from the user's quote, snapshotting the price and
 * assigning the latest published schedule version.
 * - 403 when the quote belongs to someone else, 410 QUOTE_EXPIRED when expired.
 * - Retrying with a quote that already produced a PENDING_PAYMENT enrollment returns it;
 *   a quote that was already used otherwise is a 409.
 * - An unpaid enrollment for the same plan (and team) is reused instead of duplicated.
 */
export function createEnrollmentFromQuote({ user, quoteId }) {
  if (!user) throw unauthenticatedError();
  const quote = findQuote(quoteId);
  if (!quote) throw notFoundError('Quote');
  if (quote.userId !== user._id) throw forbiddenError('This quote belongs to another account.');

  const converted = db.enrollments.find((enrollment) => enrollment.quoteId === quote._id);
  if (converted) {
    if (converted.userId === user._id && converted.status === ENROLLMENT_STATUS.PENDING_PAYMENT) {
      return converted;
    }
    throw httpError(409, 'QUOTE_ALREADY_USED', 'This quote has already been used. Get a new quote to continue.');
  }
  if (isExpired(quote.expiresAt)) {
    throw httpError(410, 'QUOTE_EXPIRED', 'This quote has expired. Refresh it to see the current price.');
  }

  const plan = findPlan(quote.planId);
  if (!plan) throw notFoundError('Plan');
  const teamId = quote.teamId ?? null;
  if (teamId) {
    const team = findTeam(teamId);
    if (!team || team.status === TEAM_STATUS.DISBANDED) {
      throw invalidTransition('This team is no longer available.');
    }
    if (!isTeamMember(team, user._id)) throw forbiddenError('You are no longer a member of this team.');
  }

  const sameTarget = (enrollment) =>
    enrollment.userId === user._id &&
    enrollment.planId === plan._id &&
    (enrollment.teamId ?? null) === teamId;
  if (db.enrollments.some((enrollment) => sameTarget(enrollment) && LEARNING_STATUSES.includes(enrollment.status))) {
    throw httpError(
      409,
      'ALREADY_ENROLLED',
      teamId ? 'You are already enrolled with this team.' : 'You already have an active enrollment for this plan.',
    );
  }

  const unpaid = latestBy(
    db.enrollments.filter(
      (enrollment) => sameTarget(enrollment) && enrollment.status === ENROLLMENT_STATUS.PENDING_PAYMENT,
    ),
    'createdAt',
  );
  if (unpaid) {
    // Reuse the unpaid enrollment; it takes the newest quote unless a payment is in flight.
    if (latestPaymentFor(unpaid._id)?.status !== PAYMENT_STATUS.PENDING) {
      unpaid.quoteId = quote._id;
      unpaid.priceSnapshot = snapshotFromQuote(quote);
    }
    return unpaid;
  }

  const template = getLatestPublishedTemplate(planTemplateKey(plan));
  const enrollment = {
    _id: oid(),
    userId: user._id,
    teamId,
    planId: plan._id,
    quoteId: quote._id,
    scheduleTemplateId: template?._id ?? null,
    enrollmentType: quote.enrollmentType || (teamId ? ENROLLMENT_TYPE.TEAM : ENROLLMENT_TYPE.INDIVIDUAL),
    scheduleVersion: template?.version ?? null,
    priceSnapshot: snapshotFromQuote(quote),
    status: ENROLLMENT_STATUS.PENDING_PAYMENT,
    createdAt: nowIso(),
    activatedAt: null,
    completedAt: null,
  };
  db.enrollments.push(enrollment);
  return enrollment;
}

export function paymentsForEnrollment(enrollmentId) {
  if (!enrollmentId) return [];
  return db.payments.filter((payment) => payment.enrollmentId === enrollmentId);
}

/** The most recent payment of an enrollment (or null). */
export function latestPaymentFor(enrollmentId) {
  return latestBy(paymentsForEnrollment(enrollmentId), 'createdAt');
}

/** SD8: a SUCCESS payment that was not flagged for review. */
export function hasSuccessfulPayment(enrollmentId) {
  return paymentsForEnrollment(enrollmentId).some(
    (payment) => payment.status === PAYMENT_STATUS.SUCCESS && !payment.flagged,
  );
}

/** Gateway events of a payment, oldest first. */
export function paymentEventsFor(paymentId) {
  if (!paymentId) return [];
  return sortByTime(
    db.paymentEvents.filter((event) => event.paymentId === paymentId),
    'processedAt',
  );
}

function certificateForEnrollment(enrollmentId) {
  return latestBy(
    db.certificates.filter((certificate) => certificate.enrollmentId === enrollmentId),
    'issuedAt',
  );
}

function priceSnapshotDto(priceSnapshot) {
  if (!priceSnapshot) return null;
  return {
    basePrice: priceSnapshot.basePrice ?? null,
    discountPercent: priceSnapshot.discountPercent ?? 0,
    payableAmount: priceSnapshot.payableAmount ?? null,
    currency: priceSnapshot.currency || CURRENCY,
  };
}

/** Enrollment (contract shape) incl. paymentStatus, termsAcceptedVersion, progress and certificateId. */
export function enrollmentDto(enrollment) {
  if (!enrollment) return null;
  const team = enrollment.teamId ? findTeam(enrollment.teamId) : null;
  const progress = listProgressForEnrollment(enrollment);
  const certificate = certificateForEnrollment(enrollment._id);
  return {
    _id: enrollment._id,
    userId: enrollment.userId,
    teamId: enrollment.teamId ?? null,
    team: team ? { _id: team._id, name: team.name } : null,
    planId: enrollment.planId,
    plan: planRef(enrollment.planId),
    quoteId: enrollment.quoteId ?? null,
    enrollmentType:
      enrollment.enrollmentType ||
      (enrollment.teamId ? ENROLLMENT_TYPE.TEAM : ENROLLMENT_TYPE.INDIVIDUAL),
    scheduleTemplateId: enrollment.scheduleTemplateId ?? null,
    scheduleVersion: enrollment.scheduleVersion ?? null,
    priceSnapshot: priceSnapshotDto(enrollment.priceSnapshot),
    status: enrollment.status,
    paymentStatus: latestPaymentFor(enrollment._id)?.status ?? null,
    termsAcceptedVersion: acceptedTermsVersion(enrollment._id),
    progress: {
      approved: progress.filter(isApproved).length,
      total: progress.length,
    },
    certificateId: certificate?._id ?? null,
    createdAt: enrollment.createdAt ?? null,
    activatedAt: enrollment.activatedAt ?? null,
    completedAt: enrollment.completedAt ?? null,
  };
}

/**
 * SD7: creates a gateway order (payment CREATED) for the owner's PENDING_PAYMENT enrollment.
 * The amount always comes from the enrollment's price snapshot, never from the browser.
 * Errors: 403 EMAIL_NOT_VERIFIED, 422 TERMS_NOT_ACCEPTED, 409 INVALID_TRANSITION.
 */
export function createPaymentOrder({ user, enrollment }) {
  if (!enrollment) throw notFoundError('Enrollment');
  if (!user || enrollment.userId !== user._id) throw forbiddenError();
  // SD3: unverified users cannot pay.
  if (!user.emailVerified) {
    throw forbiddenError('Verify your email address before paying.', 'EMAIL_NOT_VERIFIED');
  }
  // SD5: the latest terms version must be accepted for this enrollment.
  const terms = getLatestTerms();
  if (terms && !hasAcceptedTerms(enrollment._id, terms.version)) {
    throw httpError(422, 'TERMS_NOT_ACCEPTED', 'Accept the latest terms and conditions before paying.');
  }
  if (enrollment.status !== ENROLLMENT_STATUS.PENDING_PAYMENT) {
    throw invalidTransition('This enrollment is not awaiting payment.');
  }
  const previous = latestPaymentFor(enrollment._id);
  if (previous?.status === PAYMENT_STATUS.PENDING) {
    throw invalidTransition('Your previous payment is still being confirmed. Please wait a moment.');
  }
  if (previous?.status === PAYMENT_STATUS.SUCCESS) {
    throw invalidTransition('We have received a payment for this enrollment and it is being reviewed.');
  }

  const now = nowIso();
  const snapshotPrice = enrollment.priceSnapshot || {};
  const payment = {
    _id: oid(),
    enrollmentId: enrollment._id,
    userId: user._id,
    orderId: `order_${randomString(14)}`,
    provider: 'mock',
    amount: Number(snapshotPrice.payableAmount) || 0,
    currency: snapshotPrice.currency || CURRENCY,
    status: PAYMENT_STATUS.CREATED,
    gatewayReference: null,
    flagged: false,
    flagReason: null,
    createdAt: now,
    updatedAt: now,
  };
  db.payments.push(payment);
  recordPaymentEvent(payment, `evt_${payment.orderId}_created`, PAYMENT_EVENT_TYPES.ORDER_CREATED);
  return payment;
}

/** POST /payments/orders body: { paymentId, orderId, provider, amount, currency, status, checkoutData } */
export function orderResponseDto(payment, user, enrollment) {
  if (!payment) return null;
  return {
    paymentId: payment._id,
    orderId: payment.orderId,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    checkoutData: {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      merchantName: MERCHANT_NAME,
      description: planLabel(enrollment?.planId),
      prefill: { name: user?.name ?? '', email: user?.email ?? '' },
    },
  };
}

function recordPaymentEvent(payment, eventId, type, extra = {}) {
  const event = {
    _id: oid(),
    paymentId: payment._id,
    provider: payment.provider || 'mock',
    eventId,
    type,
    payload: {
      orderId: payment.orderId,
      amount: payment.amount,
      currency: payment.currency,
      note: PAYMENT_EVENT_NOTES[type] ?? null,
      ...extra,
    },
    processedAt: nowIso(),
  };
  db.paymentEvents.push(event);
  return event;
}

/** SD8: the captured amount and order must match the enrollment, otherwise flag for review. */
function paymentMismatch(payment, enrollment) {
  if (!enrollment) return 'No enrollment matches this order.';
  const expected = Number(enrollment.priceSnapshot?.payableAmount);
  const expectedCurrency = enrollment.priceSnapshot?.currency || CURRENCY;
  if (Number(payment.amount) !== expected || (payment.currency || CURRENCY) !== expectedCurrency) {
    return `Amount mismatch: received ${formatRupees(payment.amount)}, expected ${formatRupees(expected)}.`;
  }
  if (enrollment.status !== ENROLLMENT_STATUS.PENDING_PAYMENT) {
    return 'The enrollment was not awaiting payment (possible duplicate payment).';
  }
  return null;
}

const scheduledSettlements = new Set();

function schedulePendingSettlement(orderId, delayMs = PENDING_AUTO_SUCCESS_MS) {
  if (scheduledSettlements.has(orderId)) return;
  scheduledSettlements.add(orderId);
  runLater(() => {
    scheduledSettlements.delete(orderId);
    const payment = findPaymentByOrderId(orderId);
    if (payment?.status === PAYMENT_STATUS.PENDING) completeMockPayment({ orderId, outcome: 'success' });
  }, delayMs);
}

/**
 * Mock gateway: simulates the provider's SIGNED webhook for an order (SD8).
 * - Idempotent: one eventId per (orderId, outcome); a replay changes nothing.
 * - Only CREATED / PENDING payments change; SUCCESS is recorded once and never undone.
 * - success: SUCCESS + gatewayReference, events payment.authorized + payment.captured, then the
 *   enrollment is activated (or the payment is flagged when the amount does not match).
 * - failure: FAILED + payment.failed.  pending: PENDING + payment.pending, auto-success in 25 s.
 * Returns { status, payment, replayed }.
 */
export function completeMockPayment({ orderId, outcome }) {
  const normalized = String(outcome ?? '')
    .trim()
    .toLowerCase();
  const details = [];
  if (!orderId) details.push(fieldError('orderId', 'orderId is required.'));
  if (!PAYMENT_OUTCOMES.includes(normalized)) {
    details.push(fieldError('outcome', 'Outcome must be success, failure or pending.'));
  }
  if (details.length > 0) throw validationFailure(details);

  const payment = findPaymentByOrderId(orderId);
  if (!payment) throw notFoundError('Order');

  const eventId = `evt_${payment.orderId}_${normalized}`;
  // SD8: a replayed event is acknowledged and ignored.
  if (db.paymentEvents.some((event) => event.eventId === eventId)) {
    return { status: payment.status, payment, replayed: true };
  }
  if (!OPEN_PAYMENT_STATUSES.includes(payment.status)) {
    return { status: payment.status, payment, replayed: true };
  }

  const now = nowIso();
  if (normalized === 'failure') {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.updatedAt = now;
    recordPaymentEvent(payment, eventId, PAYMENT_EVENT_TYPES.FAILED, {
      note: 'Payment declined by the bank (mock gateway).',
    });
    return { status: payment.status, payment, replayed: false };
  }

  if (normalized === 'pending') {
    payment.status = PAYMENT_STATUS.PENDING;
    payment.updatedAt = now;
    recordPaymentEvent(payment, eventId, PAYMENT_EVENT_TYPES.PENDING);
    schedulePendingSettlement(payment.orderId);
    return { status: payment.status, payment, replayed: false };
  }

  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.gatewayReference = `pay_${randomString(14)}`;
  payment.updatedAt = now;
  recordPaymentEvent(payment, `${eventId}_authorized`, PAYMENT_EVENT_TYPES.AUTHORIZED);
  recordPaymentEvent(payment, eventId, PAYMENT_EVENT_TYPES.CAPTURED, {
    gatewayReference: payment.gatewayReference,
  });

  const enrollment = findEnrollment(payment.enrollmentId);
  const problem = paymentMismatch(payment, enrollment);
  if (problem) {
    // SD8: a mismatch is flagged for review and never activates the enrollment.
    payment.flagged = true;
    payment.flagReason = problem;
    recordPaymentEvent(payment, `${eventId}_flagged`, PAYMENT_EVENT_TYPES.FLAGGED, { note: problem });
  } else {
    activateEnrollment(enrollment);
  }
  return { status: payment.status, payment, replayed: false };
}

/**
 * Settles PENDING mock payments of one enrollment whose 25-second window has passed (the
 * in-memory timer is lost on a page reload). Call it before reading an enrollment's status.
 */
export function settleOverduePendingPayments(enrollmentId) {
  if (!enrollmentId) return [];
  const now = Date.now();
  const settled = [];
  paymentsForEnrollment(enrollmentId).forEach((payment) => {
    if (payment.status !== PAYMENT_STATUS.PENDING) return;
    const pendingEvent = latestBy(
      db.paymentEvents.filter(
        (event) => event.paymentId === payment._id && event.type === PAYMENT_EVENT_TYPES.PENDING,
      ),
      'processedAt',
    );
    const since = toTime(pendingEvent?.processedAt ?? payment.updatedAt);
    const waited = since ? now - since : PENDING_AUTO_SUCCESS_MS;
    if (waited >= PENDING_AUTO_SUCCESS_MS) {
      completeMockPayment({ orderId: payment.orderId, outcome: 'success' });
      settled.push(payment);
    } else {
      schedulePendingSettlement(payment.orderId, Math.max(1000, PENDING_AUTO_SUCCESS_MS - waited));
    }
  });
  return settled;
}

/**
 * SD6/SD8: PENDING_PAYMENT -> ACTIVE once (never twice). Individual enrollments get their task
 * progress (MM11); team enrollments re-check team readiness (SD11). Queues the confirmation email.
 */
export function activateEnrollment(enrollment) {
  if (!enrollment) return null;
  if (enrollment.status !== ENROLLMENT_STATUS.PENDING_PAYMENT) return enrollment;
  enrollment.status = ENROLLMENT_STATUS.ACTIVE;
  enrollment.activatedAt = nowIso();
  ensureTemplateAssigned(enrollment);

  if (enrollment.teamId) {
    const team = findTeam(enrollment.teamId);
    if (team) refreshTeamStatus(team);
  } else {
    createProgressForEnrollment(enrollment);
  }

  const user = findUser(enrollment.userId);
  if (user) {
    queueEmail({
      to: user.email,
      template: EMAIL_TEMPLATES.PAYMENT_SUCCESS,
      subject: 'Payment received: your internship is active',
      link: ROUTES.DASHBOARD,
      payload: {
        name: user.name,
        enrollmentId: enrollment._id,
        plan: planLabel(enrollment.planId),
        amount: enrollment.priceSnapshot?.payableAmount ?? null,
        currency: enrollment.priceSnapshot?.currency || CURRENCY,
      },
    });
  }
  return enrollment;
}

// ===========================================================================
// Learning: templates, task progress and the unlock engine (MM9-MM11, MM15, SD12)
// ===========================================================================

/** Task definitions of one template version, ordered by sequence. */
export function tasksForTemplate(templateId) {
  if (!templateId) return [];
  return db.taskDefinitions
    .filter((task) => task.templateId === templateId)
    .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
}

function isApproved(progress) {
  return progress?.status === TASK_STATUS.APPROVED;
}

/**
 * Where an enrollment's task progress lives. SD12: a team enrollment reads the team's ONE
 * shared progress set once the team is ACTIVE (or shared progress exists).
 */
export function progressScopeFor(enrollment) {
  if (!enrollment) return { enrollmentId: null };
  if (enrollment.teamId) {
    const team = findTeam(enrollment.teamId);
    const shared = db.taskProgress.some((progress) => progress.teamId === enrollment.teamId);
    if (shared || team?.status === TEAM_STATUS.ACTIVE) return { teamId: enrollment.teamId };
  }
  return { enrollmentId: enrollment._id };
}

function scopeOfProgress(progress) {
  if (progress?.teamId) return { teamId: progress.teamId };
  return { enrollmentId: progress?.enrollmentId ?? null };
}

/** Progress records of a scope: { teamId } or { enrollmentId }. */
export function progressInScope(scope) {
  if (!scope) return [];
  if (scope.teamId) return db.taskProgress.filter((progress) => progress.teamId === scope.teamId);
  if (scope.enrollmentId) {
    return db.taskProgress.filter(
      (progress) => progress.enrollmentId === scope.enrollmentId && !progress.teamId,
    );
  }
  return [];
}

function taskSequence(taskId) {
  const sequence = Number(findTaskDefinition(taskId)?.sequence);
  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER;
}

function sortProgressBySequence(list) {
  return [...list].sort((a, b) => taskSequence(a.taskId) - taskSequence(b.taskId));
}

/** An enrollment's task progress (scope-aware), ordered by task sequence. */
export function listProgressForEnrollment(enrollment) {
  if (!enrollment) return [];
  return sortProgressBySequence(progressInScope(progressScopeFor(enrollment)));
}

function createProgressRecords(tasks, { enrollmentId = null, teamId = null }) {
  const scope = teamId ? { teamId } : { enrollmentId };
  const existingTaskIds = new Set(progressInScope(scope).map((progress) => progress.taskId));
  const templateTaskIds = new Set(tasks.map((task) => task._id));
  const now = nowIso();
  tasks.forEach((task) => {
    if (existingTaskIds.has(task._id)) return; // idempotent
    // MM11: tasks without prerequisites start AVAILABLE, the rest LOCKED.
    const prerequisites = (task.prerequisiteTaskIds || []).filter((id) => templateTaskIds.has(id));
    db.taskProgress.push({
      _id: oid(),
      enrollmentId: enrollmentId ?? null,
      teamId: teamId ?? null,
      taskId: task._id,
      status: prerequisites.length > 0 ? TASK_STATUS.LOCKED : TASK_STATUS.AVAILABLE,
      startedAt: null,
      submittedAt: null,
      approvedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  });
  unlockDependents(scope);
  return sortProgressBySequence(progressInScope(scope));
}

/** MM11: one progress record per task of the assigned template version (idempotent). */
export function createProgressForEnrollment(enrollment) {
  if (!enrollment) return [];
  const template = ensureTemplateAssigned(enrollment);
  if (!template) return [];
  return createProgressRecords(tasksForTemplate(template._id), { enrollmentId: enrollment._id });
}

const ENROLLMENT_PREFERENCE = [
  ENROLLMENT_STATUS.IN_PROGRESS,
  ENROLLMENT_STATUS.ACTIVE,
  ENROLLMENT_STATUS.COMPLETED,
  ENROLLMENT_STATUS.PENDING_PAYMENT,
  ENROLLMENT_STATUS.SUSPENDED,
  ENROLLMENT_STATUS.CANCELLED,
];

function preferredEnrollment(enrollments) {
  if (!enrollments || enrollments.length === 0) return null;
  const rank = (enrollment) => {
    const index = ENROLLMENT_PREFERENCE.indexOf(enrollment.status);
    return index === -1 ? ENROLLMENT_PREFERENCE.length : index;
  };
  return [...enrollments].sort(
    (a, b) => rank(a) - rank(b) || toTime(b.createdAt) - toTime(a.createdAt),
  )[0];
}

/**
 * SD12: ONE shared progress set for an ACTIVE team (teamId set, enrollmentId = the leader's
 * enrollment). Every member enrollment is aligned to the same schedule version. Idempotent.
 */
export function createProgressForTeam(team) {
  if (!team) return [];
  const members = db.enrollments.filter(
    (enrollment) => enrollment.teamId === team._id && enrollment.status !== ENROLLMENT_STATUS.CANCELLED,
  );
  const anchor =
    preferredEnrollment(members.filter((enrollment) => enrollment.userId === team.leaderId)) ??
    preferredEnrollment(members);
  let template = anchor ? ensureTemplateAssigned(anchor) : null;
  if (!template) {
    const plan = findPlan(team.planId);
    template = plan ? getLatestPublishedTemplate(planTemplateKey(plan)) : null;
  }
  if (!template) return [];
  members.forEach((enrollment) => {
    enrollment.scheduleTemplateId = template._id;
    enrollment.scheduleVersion = template.version;
  });
  return createProgressRecords(tasksForTemplate(template._id), {
    enrollmentId: anchor?._id ?? null,
    teamId: team._id,
  });
}

/**
 * MM11 unlock engine: LOCKED -> AVAILABLE when every prerequisite task in the same scope is
 * APPROVED. Accepts a scope ({ teamId } | { enrollmentId }) or any progress list of one scope.
 * Returns the progress records that were unlocked.
 */
export function unlockDependents(scopeOrList) {
  let list;
  if (Array.isArray(scopeOrList)) {
    list = scopeOrList.length > 0 ? progressInScope(scopeOfProgress(scopeOrList[0])) : [];
  } else {
    list = progressInScope(scopeOrList);
  }
  const byTask = new Map(list.map((progress) => [progress.taskId, progress]));
  const now = nowIso();
  const unlocked = [];
  list.forEach((progress) => {
    if (progress.status !== TASK_STATUS.LOCKED) return;
    const task = findTaskDefinition(progress.taskId);
    // Unlocking depends on completion only, never on the calendar day.
    const prerequisites = (task?.prerequisiteTaskIds || [])
      .map((taskId) => byTask.get(taskId))
      .filter(Boolean);
    if (prerequisites.every(isApproved)) {
      progress.status = TASK_STATUS.AVAILABLE;
      progress.updatedAt = now;
      unlocked.push(progress);
    }
  });
  return unlocked;
}

/** MM11/SD12: the enrollment owner, or a JOINED member of the progress's team. */
export function userCanAccessProgress(user, progress) {
  if (!user || !progress) return false;
  const enrollment = findEnrollment(progress.enrollmentId);
  if (enrollment && enrollment.userId === user._id) return true;
  return Boolean(progress.teamId) && isTeamMember(progress.teamId, user._id);
}

/** The user's own enrollment behind a progress record (team members: their team enrollment). */
export function enrollmentForUserAndProgress(user, progress) {
  if (!user || !progress) return null;
  if (progress.teamId) {
    return preferredEnrollment(
      db.enrollments.filter(
        (enrollment) => enrollment.userId === user._id && enrollment.teamId === progress.teamId,
      ),
    );
  }
  const enrollment = findEnrollment(progress.enrollmentId);
  return enrollment && enrollment.userId === user._id ? enrollment : null;
}

/** Enrollments affected by a progress record (all member enrollments for team progress). */
function relatedEnrollments(progress) {
  if (progress?.teamId) {
    return db.enrollments.filter(
      (enrollment) =>
        enrollment.teamId === progress.teamId && enrollment.status !== ENROLLMENT_STATUS.CANCELLED,
    );
  }
  const enrollment = findEnrollment(progress?.enrollmentId);
  return enrollment ? [enrollment] : [];
}

/** SD6: ACTIVE -> IN_PROGRESS when the first task starts. */
function markEnrollmentsInProgress(progress) {
  relatedEnrollments(progress).forEach((enrollment) => {
    if (enrollment.status === ENROLLMENT_STATUS.ACTIVE) enrollment.status = ENROLLMENT_STATUS.IN_PROGRESS;
  });
}

function taskStateMessage(status) {
  switch (status) {
    case TASK_STATUS.LOCKED:
      return 'This task is locked until its prerequisite tasks are approved.';
    case TASK_STATUS.IN_PROGRESS:
      return 'This task is already in progress.';
    case TASK_STATUS.SUBMITTED:
      return 'Your submission is waiting for review.';
    case TASK_STATUS.CHANGES_REQUESTED:
      return 'Changes were requested on this task. Resubmit your work instead.';
    case TASK_STATUS.APPROVED:
      return 'This task is already approved.';
    default:
      return 'This task cannot be changed right now.';
  }
}

/** 403 unless the user may work on this progress record with an ACTIVE / IN_PROGRESS enrollment. */
function assertCanWorkOn(user, progress) {
  if (!userCanAccessProgress(user, progress)) throw forbiddenError();
  const enrollment = enrollmentForUserAndProgress(user, progress);
  if (enrollment && !LEARNING_STATUSES.includes(enrollment.status)) {
    throw forbiddenError('Your enrollment is not active.', 'ENROLLMENT_NOT_ACTIVE');
  }
  return enrollment;
}

/**
 * MM11: AVAILABLE -> IN_PROGRESS (409 INVALID_TRANSITION otherwise). Pass `{ user }` to also
 * enforce ownership (403) and an active enrollment (403 ENROLLMENT_NOT_ACTIVE).
 */
export function startTask(progress, { user } = {}) {
  if (!progress) throw notFoundError('Task');
  if (user) assertCanWorkOn(user, progress);
  if (progress.status !== TASK_STATUS.AVAILABLE) throw invalidTransition(taskStateMessage(progress.status));
  const now = nowIso();
  progress.status = TASK_STATUS.IN_PROGRESS;
  progress.startedAt = now;
  progress.updatedAt = now;
  markEnrollmentsInProgress(progress);
  return progress;
}

function taskSummary(task, fallbackId) {
  if (!task) {
    return {
      _id: fallbackId ?? null,
      title: 'Unknown task',
      sequence: 0,
      estimatedHours: null,
      requiresTrainerReview: true,
      prerequisiteTaskIds: [],
    };
  }
  return {
    _id: task._id,
    title: task.title ?? '',
    sequence: Number(task.sequence) || 0,
    estimatedHours: task.estimatedHours ?? null,
    requiresTrainerReview: task.requiresTrainerReview !== false,
    prerequisiteTaskIds: Array.isArray(task.prerequisiteTaskIds) ? [...task.prerequisiteTaskIds] : [],
  };
}

function latestSubmissionOf(submissions) {
  return submissions.reduce(
    (best, submission) =>
      !best || (Number(submission.attemptNumber) || 0) >= (Number(best.attemptNumber) || 0)
        ? submission
        : best,
    null,
  );
}

/** TaskProgress (contract shape) with task summary, prerequisites, attempts and lastReviewStatus. */
export function progressDto(progress) {
  if (!progress) return null;
  const task = findTaskDefinition(progress.taskId);
  const byTask = new Map(
    progressInScope(scopeOfProgress(progress)).map((item) => [item.taskId, item]),
  );
  const submissions = db.taskSubmissions.filter(
    (submission) => submission.taskProgressId === progress._id,
  );
  return {
    _id: progress._id,
    enrollmentId: progress.enrollmentId ?? null,
    teamId: progress.teamId ?? null,
    taskId: progress.taskId,
    status: progress.status,
    startedAt: progress.startedAt ?? null,
    submittedAt: progress.submittedAt ?? null,
    approvedAt: progress.approvedAt ?? null,
    attempts: submissions.length,
    lastReviewStatus: latestSubmissionOf(submissions)?.reviewStatus ?? null,
    task: taskSummary(task, progress.taskId),
    prerequisites: (task?.prerequisiteTaskIds || []).map((taskId) => {
      const prerequisite = byTask.get(taskId);
      return {
        taskId,
        progressId: prerequisite?._id ?? null,
        title: findTaskDefinition(taskId)?.title ?? 'Unknown task',
        status: prerequisite?.status ?? TASK_STATUS.LOCKED,
      };
    }),
  };
}

/**
 * GET /tasks/:progressId/content. MM11: locked tasks omit the instruction fields.
 * Pass the viewing user so `enrollment` is their own (team members have their own enrollment).
 */
export function taskContentDto(progress, user) {
  if (!progress) return null;
  const task = findTaskDefinition(progress.taskId);
  const locked = progress.status === TASK_STATUS.LOCKED;
  const summary = taskSummary(task, progress.taskId);
  const taskView = {
    _id: summary._id,
    title: summary.title,
    sequence: summary.sequence,
    estimatedHours: summary.estimatedHours,
    requiresTrainerReview: summary.requiresTrainerReview,
  };
  if (!locked && task) {
    Object.assign(taskView, {
      problemStatement: task.problemStatement ?? '',
      expectedOutcome: task.expectedOutcome ?? '',
      acceptanceCriteria: Array.isArray(task.acceptanceCriteria) ? [...task.acceptanceCriteria] : [],
      starterRepoUrl: task.starterRepoUrl ?? null,
    });
  }
  const enrollment =
    (user && enrollmentForUserAndProgress(user, progress)) || findEnrollment(progress.enrollmentId) || null;
  const team = progress.teamId ? findTeam(progress.teamId) : null;
  let enrollmentType = ENROLLMENT_TYPE.INDIVIDUAL;
  if (progress.teamId) enrollmentType = ENROLLMENT_TYPE.TEAM;
  else if (enrollment?.enrollmentType) enrollmentType = enrollment.enrollmentType;
  return {
    locked,
    progress: progressDto(progress),
    task: taskView,
    enrollment: {
      _id: enrollment?._id ?? progress.enrollmentId ?? null,
      enrollmentType,
      teamId: progress.teamId ?? enrollment?.teamId ?? null,
    },
    team: team ? { _id: team._id, name: team.name, repoUrl: team.repoUrl ?? null } : null,
  };
}

function sortedDays(template) {
  return [...(template?.days || [])].sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
}

/**
 * GET /enrollments/:id/schedule body. A day is `completed` when all of its tasks are approved;
 * a day without tasks counts as completed once every task scheduled before it is approved.
 */
export function enrollmentScheduleDto(enrollment) {
  if (!enrollment) return null;
  const template = findTemplate(enrollment.scheduleTemplateId);
  if (!template) {
    return {
      enrollmentId: enrollment._id,
      scheduleTemplateId: enrollment.scheduleTemplateId ?? null,
      version: enrollment.scheduleVersion ?? null,
      totalDays: 0,
      days: [],
    };
  }
  const tasks = tasksForTemplate(template._id);
  const progressList = listProgressForEnrollment(enrollment);
  const progressByTask = new Map(progressList.map((progress) => [progress.taskId, progress]));
  const taskApproved = (task) => isApproved(progressByTask.get(task._id));

  const days = sortedDays(template).map((day) => {
    const dayNumber = Number(day.dayNumber);
    const dayTasks = tasks.filter((task) => Number(task.dayNumber) === dayNumber);
    const earlierTasks = tasks.filter(
      (task) => Number(task.dayNumber) > 0 && Number(task.dayNumber) < dayNumber,
    );
    const firstTask = dayTasks[0] ?? null;
    const firstProgress = firstTask ? (progressByTask.get(firstTask._id) ?? null) : null;
    const completed =
      dayTasks.length > 0
        ? dayTasks.every(taskApproved)
        : progressList.length > 0 && earlierTasks.every(taskApproved);
    return {
      dayNumber,
      title: day.title ?? '',
      activity: day.activity ?? '',
      requiredEvidence: day.requiredEvidence ?? '',
      hasSop: Boolean(String(day.sopContent ?? '').trim()),
      task: firstTask
        ? {
            progressId: firstProgress?._id ?? null,
            title: firstTask.title ?? '',
            status: firstProgress?.status ?? TASK_STATUS.LOCKED,
          }
        : null,
      completed,
    };
  });
  return {
    enrollmentId: enrollment._id,
    scheduleTemplateId: template._id,
    version: template.version,
    totalDays: days.length,
    days,
  };
}

/** GET /internship-plans/:id/schedule-preview: day titles only, never SOP content (MM9). */
export function schedulePreviewDto(plan) {
  if (!plan) return null;
  const template = getLatestPublishedTemplate(planTemplateKey(plan));
  const days = sortedDays(template).map((day) => ({
    dayNumber: Number(day.dayNumber),
    title: day.title ?? '',
  }));
  return { planId: plan._id, totalDays: days.length, days };
}

/** MM15: paid content (schedule details, SOPs, tasks) needs an active enrollment AND a SUCCESS payment. */
export function canAccessPaidContent(enrollment) {
  return (
    Boolean(enrollment) &&
    ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status) &&
    hasSuccessfulPayment(enrollment._id)
  );
}

/** The schedule day (with its markdown sopContent) of the enrollment's template, or null. */
export function sopDayFor(enrollment, dayNumber) {
  const template = enrollment ? findTemplate(enrollment.scheduleTemplateId) : null;
  if (!template) return null;
  return (template.days || []).find((day) => Number(day.dayNumber) === Number(dayNumber)) ?? null;
}

/** MM15: watermark with the student's name and ID. */
export function sopWatermarkText(user) {
  if (!user) return 'Confidential';
  return `${user.name} · ${user._id}`;
}

/** MM15: every SOP read is logged. */
export function logSopAccess({ user, enrollment, dayNumber, ip = DEFAULT_IP }) {
  const log = {
    _id: oid(),
    userId: user?._id ?? null,
    enrollmentId: enrollment?._id ?? null,
    dayNumber: Number(dayNumber),
    ip,
    accessedAt: nowIso(),
  };
  db.sopAccessLogs.push(log);
  return log;
}

// ===========================================================================
// Submissions (MM12, SD4) and reviews (MM14)
// ===========================================================================

const EXTENSION_TYPES = Object.freeze({
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
});

const TYPE_EXTENSIONS = Object.freeze({
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
});

function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name ?? ''));
  return match ? match[1].toLowerCase() : '';
}

function resolveImageType(file) {
  const declared = String(file?.type ?? '')
    .trim()
    .toLowerCase();
  if (declared) return declared === 'image/jpg' ? 'image/jpeg' : declared;
  return EXTENSION_TYPES[fileExtension(file?.name)] ?? '';
}

/** SD4: file names are sanitised before they are stored. */
function sanitizeFileName(name) {
  const base = String(name ?? '').split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'screenshot').slice(-120);
}

/** SD4: png, jpg or webp, at most 5 MB. Returns an error message or null. */
function screenshotProblem(file) {
  const name = sanitizeFileName(file?.name);
  if (!SUBMISSION_RULES.allowedImageTypes.includes(resolveImageType(file))) {
    return `"${name}" is not a PNG, JPG or WebP image.`;
  }
  const size = Number(file?.size);
  if (!Number.isFinite(size) || size <= 0) return `"${name}" is empty.`;
  if (size > SUBMISSION_RULES.maxFileSizeBytes) {
    const limit = Math.round(SUBMISSION_RULES.maxFileSizeBytes / (1024 * 1024));
    return `"${name}" is larger than ${limit} MB.`;
  }
  return null;
}

function readArrayBuffer(file) {
  if (typeof file?.arrayBuffer === 'function') return file.arrayBuffer();
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
      reader.readAsArrayBuffer(file);
    });
  }
  return Promise.reject(new Error('Reading files is not supported here.'));
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

/** SD4: the stored descriptor (key format submissions/{enrollmentId}/{uuid}.ext), url still empty. */
function describeUpload(file, enrollmentId) {
  const mimeType = resolveImageType(file);
  const extension = TYPE_EXTENSIONS[mimeType] ?? 'png';
  return {
    storageKey: `submissions/${enrollmentId || 'unassigned'}/${makeUuid()}.${extension}`,
    name: sanitizeFileName(file?.name),
    mimeType,
    sizeBytes: Number(file?.size) || 0,
    url: null,
  };
}

/** Object URL for this browser session only (db.js swaps blob: urls for a placeholder on load). */
function objectUrlFor(file) {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return null;
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

/**
 * SD4 storage adapter (mock): validates one screenshot and "stores" it.
 * Resolves to { storageKey, name, mimeType, sizeBytes, url }. The url is a data URL for files up
 * to 400 KB (persisted with the DB), else an object URL (this session only), else a placeholder.
 * Throws (rejects with) 422 VALIDATION_ERROR, field "screenshots", for a wrong type or > 5 MB.
 */
export async function storeUploadedFile(file, { enrollmentId } = {}) {
  const problem = screenshotProblem(file);
  if (problem) throw validationFailure([fieldError('screenshots', problem)]);
  const stored = describeUpload(file, enrollmentId);
  if (stored.sizeBytes <= MAX_INLINE_SCREENSHOT_BYTES) {
    try {
      stored.url = `data:${stored.mimeType};base64,${bytesToBase64(await readArrayBuffer(file))}`;
    } catch {
      stored.url = null;
    }
  }
  stored.url = stored.url || objectUrlFor(file) || placeholderScreenshot(stored.name);
  return stored;
}

/** Synchronous fallback used when createSubmission receives raw File objects (no data URL). */
function storeUploadedFileSync(file, enrollmentId) {
  const stored = describeUpload(file, enrollmentId);
  stored.url = objectUrlFor(file) || placeholderScreenshot(stored.name);
  return stored;
}

function isStoredScreenshot(item) {
  return (
    Boolean(item) &&
    typeof item === 'object' &&
    typeof item.url === 'string' &&
    typeof item.storageKey === 'string'
  );
}

function screenshotDto(screenshot) {
  const name = screenshot?.name || 'Screenshot';
  return {
    storageKey: screenshot?.storageKey ?? null,
    name,
    mimeType: screenshot?.mimeType ?? 'image/png',
    sizeBytes: Number(screenshot?.sizeBytes) || 0,
    url: screenshot?.url || placeholderScreenshot(name),
  };
}

/** MM12: all three parts are mandatory; collects every field error at once. */
function validateSubmissionFields({ files, description, githubUrl }) {
  const {
    minScreenshots,
    maxScreenshots,
    minDescriptionLength,
    maxDescriptionLength,
    githubUrlPrefix,
  } = SUBMISSION_RULES;
  const details = [];
  if (files.length < minScreenshots) {
    details.push(fieldError('screenshots', 'Add at least one screenshot of your work.'));
  } else if (files.length > maxScreenshots) {
    details.push(fieldError('screenshots', `You can upload up to ${maxScreenshots} screenshots.`));
  } else {
    files.forEach((file) => {
      if (isStoredScreenshot(file)) return;
      const problem = screenshotProblem(file);
      if (problem) details.push(fieldError('screenshots', problem));
    });
  }
  if (description.length < minDescriptionLength) {
    details.push(
      fieldError(
        'description',
        description.length === 0
          ? 'Describe what you built and how you tested it.'
          : `Write at least ${minDescriptionLength} characters (${description.length}/${minDescriptionLength}).`,
      ),
    );
  } else if (description.length > maxDescriptionLength) {
    details.push(
      fieldError('description', `Keep the description under ${maxDescriptionLength} characters.`),
    );
  }
  if (!githubUrl) {
    details.push(
      fieldError('githubUrl', 'Add the GitHub link to your repository, commit or pull request.'),
    );
  } else if (!GITHUB_URL_RE.test(githubUrl)) {
    details.push(fieldError('githubUrl', `The link must start with ${githubUrlPrefix}`));
  }
  return details;
}

function assertCanSubmit(progress) {
  if (!SUBMITTABLE_STATUSES.includes(progress.status)) {
    throw invalidTransition(taskStateMessage(progress.status));
  }
}

/**
 * MM12: saves a new submission attempt (old attempts are never overwritten) and moves the task
 * to SUBMITTED. Synchronous. Pass `screenshots` as descriptors from `await storeUploadedFile()`
 * (data URLs persist); raw File objects are also accepted and validated, but are stored as
 * session-only object URLs. Errors: 403 (not the owner / a team member, or 403
 * ENROLLMENT_NOT_ACTIVE), 409 INVALID_TRANSITION (wrong task state), 422 VALIDATION_ERROR with
 * details for "screenshots", "description" and "githubUrl" (all collected at once).
 */
export function createSubmission({
  user,
  progress,
  screenshots = [],
  description = '',
  githubUrl = '',
}) {
  if (!progress) throw notFoundError('Task');
  if (!user) throw unauthenticatedError();
  // MM12: only the owner (or a member of the team for group work) can submit.
  const enrollment = assertCanWorkOn(user, progress);
  assertCanSubmit(progress);

  const files = (Array.isArray(screenshots) ? screenshots : [screenshots]).filter(Boolean);
  const text = String(description ?? '').trim();
  const link = String(githubUrl ?? '').trim();
  const details = validateSubmissionFields({ files, description: text, githubUrl: link });
  if (details.length > 0) throw validationFailure(details);

  const stored = files.map((file) =>
    isStoredScreenshot(file) ? screenshotDto(file) : storeUploadedFileSync(file, progress.enrollmentId),
  );

  const now = nowIso();
  const previous = db.taskSubmissions.filter((submission) => submission.taskProgressId === progress._id);
  const attemptNumber =
    previous.reduce((highest, submission) => Math.max(highest, Number(submission.attemptNumber) || 0), 0) + 1;
  const submission = {
    _id: oid(),
    taskProgressId: progress._id,
    enrollmentId: progress.enrollmentId ?? enrollment?._id ?? null,
    attemptNumber,
    screenshots: stored,
    description: text,
    githubUrl: link,
    submittedBy: user._id, // SD12: records which team member submitted
    submittedAt: now,
    reviewStatus: REVIEW_STATUS.PENDING,
    automatedChecks: [{ name: 'Unit tests', status: CHECK_STATUS.PASSED, required: true }],
  };
  db.taskSubmissions.push(submission);

  if (!progress.startedAt) progress.startedAt = now;
  progress.status = TASK_STATUS.SUBMITTED;
  progress.submittedAt = now;
  progress.updatedAt = now;
  markEnrollmentsInProgress(progress);
  return submission;
}

/** Submissions of one task progress, newest first. */
export function submissionsForProgress(progressId) {
  if (!progressId) return [];
  return db.taskSubmissions
    .filter((submission) => submission.taskProgressId === progressId)
    .sort(
      (a, b) =>
        (Number(b.attemptNumber) || 0) - (Number(a.attemptNumber) || 0) ||
        toTime(b.submittedAt) - toTime(a.submittedAt),
    );
}

export function latestReviewFor(submissionId) {
  if (!submissionId) return null;
  return latestBy(
    db.reviews.filter((review) => review.submissionId === submissionId),
    'reviewedAt',
  );
}

/** Review { _id, decision, feedback, reviewedAt, trainer: { _id, name } } */
export function reviewDto(review) {
  if (!review) return null;
  return {
    _id: review._id,
    decision: review.decision,
    feedback: review.feedback ?? '',
    reviewedAt: review.reviewedAt ?? null,
    trainer: nameRef(review.trainerId),
  };
}

/** Submission (contract shape) with submittedBy { _id, name } and the latest review. */
export function submissionDto(submission) {
  if (!submission) return null;
  return {
    _id: submission._id,
    taskProgressId: submission.taskProgressId,
    enrollmentId: submission.enrollmentId ?? null,
    attemptNumber: Number(submission.attemptNumber) || 1,
    description: submission.description ?? '',
    githubUrl: submission.githubUrl ?? '',
    submittedAt: submission.submittedAt ?? null,
    screenshots: (submission.screenshots || []).map(screenshotDto),
    submittedBy: nameRef(submission.submittedBy),
    reviewStatus: submission.reviewStatus ?? REVIEW_STATUS.PENDING,
    review: reviewDto(latestReviewFor(submission._id)),
  };
}

/**
 * MM14: one decision per submission by the assigned trainer.
 * - 403 when the trainer is not assigned or reviews their own work.
 * - 409 ALREADY_REVIEWED unless the submission is PENDING.
 * - 422 VALIDATION_ERROR: decision must be APPROVED | CHANGES_REQUESTED | REJECTED; feedback
 *   (10+ characters) is required unless approving.
 * - 422 CHECKS_FAILED: approval is blocked when a required automated check failed.
 * APPROVED: task APPROVED, dependents unlocked, certificate check (whole team for team work).
 * CHANGES_REQUESTED / REJECTED: task CHANGES_REQUESTED so the student can resubmit.
 * Returns raw docs { review, submission, nextPendingId } (see reviewResultDto).
 */
export function applyReview({ trainer, submission, decision, feedback }) {
  if (!submission) throw notFoundError('Submission');
  if (trainer) {
    if (trainer._id === submission.submittedBy) throw forbiddenError('You cannot review your own work.');
    if (!trainerCanAccessSubmission(trainer._id, submission)) {
      throw forbiddenError('This submission is not assigned to you.');
    }
  }
  if (submission.reviewStatus !== REVIEW_STATUS.PENDING) {
    throw httpError(409, 'ALREADY_REVIEWED', 'This submission has already been reviewed.');
  }

  const normalizedDecision = String(decision ?? '')
    .trim()
    .toUpperCase();
  const text = String(feedback ?? '').trim();
  if (!Object.values(REVIEW_DECISION).includes(normalizedDecision)) {
    throw validationFailure([fieldError('decision', 'Choose approve, request changes or reject.')]);
  }
  if (normalizedDecision !== REVIEW_DECISION.APPROVED && text.length < MIN_FEEDBACK_LENGTH) {
    throw validationFailure([
      fieldError(
        'feedback',
        text
          ? `Write at least ${MIN_FEEDBACK_LENGTH} characters so the student knows what to change.`
          : 'Feedback is required when you request changes or reject.',
      ),
    ]);
  }
  const failedCheck = (submission.automatedChecks || []).some(
    (check) => check.required && check.status === CHECK_STATUS.FAILED,
  );
  if (normalizedDecision === REVIEW_DECISION.APPROVED && failedCheck) {
    throw httpError(
      422,
      'CHECKS_FAILED',
      'A required automated check failed, so this submission cannot be approved. Request changes instead.',
    );
  }

  const now = nowIso();
  const review = {
    _id: oid(),
    submissionId: submission._id,
    trainerId: trainer?._id ?? null,
    decision: normalizedDecision,
    feedback: text,
    reviewedAt: now,
  };
  db.reviews.push(review);
  submission.reviewStatus = normalizedDecision;

  const progress = findProgress(submission.taskProgressId);
  if (progress && progress.status !== TASK_STATUS.APPROVED) {
    if (normalizedDecision === REVIEW_DECISION.APPROVED) {
      progress.status = TASK_STATUS.APPROVED;
      progress.approvedAt = now;
      progress.updatedAt = now;
      unlockDependents(scopeOfProgress(progress));
      // SD13: an approval triggers the eligibility check (for every member of a team).
      const anchor = findEnrollment(progress.enrollmentId) ?? relatedEnrollments(progress)[0];
      if (anchor) checkCertificateEligibility(anchor);
    } else {
      progress.status = TASK_STATUS.CHANGES_REQUESTED;
      progress.updatedAt = now;
    }
  }

  return {
    review,
    submission,
    nextPendingId: trainer ? nextPendingSubmissionId(trainer._id, submission._id) : null,
  };
}

/** POST /trainer/submissions/:id/review body from applyReview()'s result. */
export function reviewResultDto(result) {
  if (!result) return null;
  return {
    review: reviewDto(result.review),
    submission: submissionDto(result.submission),
    nextPendingId: result.nextPendingId ?? null,
  };
}

// ===========================================================================
// Certificates (SD13-SD15)
// ===========================================================================

/** "IP-<year>-" + the next 6-digit number above the highest one issued that year. */
export function nextCertificateNo(date = new Date()) {
  const prefix = `IP-${date.getFullYear()}-`;
  let highest = 0;
  db.certificates.forEach((certificate) => {
    const number = String(certificate.certificateNo ?? '');
    if (!number.startsWith(prefix)) return;
    const value = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(value) && value > highest) highest = value;
  });
  let next = highest + 1;
  let candidate = `${prefix}${String(next).padStart(6, '0')}`;
  while (db.certificates.some((certificate) => certificate.certificateNo === candidate)) {
    next += 1;
    candidate = `${prefix}${String(next).padStart(6, '0')}`;
  }
  return candidate;
}

function verifyPathFor(certificateNo) {
  return certificateNo ? paths.verifyCertificate(certificateNo) : null;
}

/**
 * SD13: when every task in the enrollment's scope is APPROVED, issues one certificate per
 * eligible enrollment (each team member gets their own): payment SUCCESS, enrollment ACTIVE or
 * IN_PROGRESS, no certificate yet. Sets the enrollment COMPLETED and queues the email.
 * Returns the certificates created (empty when not eligible).
 */
export function checkCertificateEligibility(enrollment) {
  if (!enrollment) return [];
  const scope = progressScopeFor(enrollment);
  const progressList = progressInScope(scope);
  if (progressList.length === 0 || !progressList.every(isApproved)) return [];

  const targets = scope.teamId
    ? db.enrollments.filter((candidate) => candidate.teamId === scope.teamId)
    : [enrollment];
  const created = [];
  targets.forEach((target) => {
    if (!LEARNING_STATUSES.includes(target.status)) return;
    if (!hasSuccessfulPayment(target._id)) return;
    // One certificate per enrollment; a revoked one is history, never re-issued.
    if (db.certificates.some((certificate) => certificate.enrollmentId === target._id)) return;

    const now = nowIso();
    const certificateNo = nextCertificateNo();
    const certificate = {
      _id: oid(),
      certificateNo,
      userId: target.userId,
      enrollmentId: target._id,
      status: CERTIFICATE_STATUS.ISSUED,
      issuedAt: now,
      pdfKey: `certificates/${certificateNo}.pdf`,
      emailStatus: EMAIL_STATUS.SENT,
      revokedAt: null,
      revokeReason: null,
    };
    db.certificates.push(certificate);
    target.status = ENROLLMENT_STATUS.COMPLETED;
    target.completedAt = now;

    const user = findUser(target.userId);
    if (user) {
      queueEmail({
        to: user.email,
        template: EMAIL_TEMPLATES.CERTIFICATE,
        subject: 'Your internship certificate is ready',
        link: ROUTES.CERTIFICATE,
        payload: { name: user.name, certificateNo, verifyUrl: verifyPathFor(certificateNo) },
      });
    }
    created.push(certificate);
  });
  return created;
}

function certificateContext(certificate) {
  const enrollment = findEnrollment(certificate.enrollmentId) ?? null;
  const plan = enrollment ? (findPlan(enrollment.planId) ?? null) : null;
  return {
    enrollment,
    plan,
    user: findUser(certificate.userId) ?? null,
    designation: plan ? (findDesignation(plan.designationId) ?? null) : null,
    domain: plan ? (findDomain(plan.domainId) ?? null) : null,
  };
}

/** Certificate (contract shape) incl. studentName, designation/domain refs, durationMonths, verifyUrl. */
export function certificateDto(certificate) {
  if (!certificate) return null;
  const { plan, user, designation, domain } = certificateContext(certificate);
  return {
    _id: certificate._id,
    certificateNo: certificate.certificateNo,
    userId: certificate.userId,
    enrollmentId: certificate.enrollmentId,
    status: certificate.status,
    issuedAt: certificate.issuedAt ?? null,
    emailStatus: certificate.emailStatus ?? EMAIL_STATUS.PENDING,
    revokedAt: certificate.revokedAt ?? null,
    revokeReason: certificate.revokeReason ?? null,
    studentName: user?.name ?? null,
    designation: catalogRef(designation),
    domain: catalogRef(domain),
    durationMonths: plan?.durationMonths ?? null,
    verifyUrl: verifyPathFor(certificate.certificateNo),
  };
}

/** Public verification (SD13): minimal data only, never the student's name or contact details. */
export function certificateVerificationDto(certificate) {
  if (!certificate) return null;
  const { plan, designation, domain } = certificateContext(certificate);
  return {
    certificateNo: certificate.certificateNo,
    status: certificate.status,
    designation: designation?.name ?? null,
    domain: domain?.name ?? null,
    durationMonths: plan?.durationMonths ?? null,
    issuedAt: certificate.issuedAt ?? null,
    revokedAt: certificate.revokedAt ?? null,
  };
}

/** A student's certificates, newest first. */
export function certificatesForUser(userId) {
  if (!userId) return [];
  return sortByTime(
    db.certificates.filter((certificate) => certificate.userId === userId),
    'issuedAt',
    'desc',
  );
}

/**
 * SD14: GET /certificates/:id/download body { url, expiresAt }. The mock "signed URL" is the
 * generated PDF as a data URL. A revoked certificate cannot be downloaded (410).
 */
export function certificateDownload(certificate) {
  if (!certificate) throw notFoundError('Certificate');
  if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
    throw httpError(410, 'CERTIFICATE_REVOKED', 'This certificate has been revoked and can no longer be downloaded.');
  }
  const certificateView = certificateDto(certificate);
  const url = createCertificatePdfDataUrl({
    certificateNo: certificateView.certificateNo,
    studentName: certificateView.studentName || 'Student',
    designation: certificateView.designation?.name || 'Internship',
    domain: certificateView.domain?.name || '',
    durationMonths: certificateView.durationMonths,
    issuedAt: certificateView.issuedAt,
    verifyUrl: certificateView.verifyUrl,
  });
  return { url, expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_MS).toISOString() };
}

/**
 * SD15: re-queues the certificate email (never creates a new certificate). emailStatus goes to
 * PENDING and the simulated worker marks it SENT a few seconds later.
 * Returns { message, emailStatus: 'PENDING', job }.
 */
export function resendCertificateEmail({ admin, certificate }) {
  if (!certificate) throw notFoundError('Certificate');
  if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
    throw invalidTransition("A revoked certificate can't be emailed.");
  }
  const user = findUser(certificate.userId);
  if (!user) throw notFoundError('Student');
  const before = { emailStatus: certificate.emailStatus ?? null };
  certificate.emailStatus = EMAIL_STATUS.PENDING;
  const job = queueEmail({
    to: user.email,
    template: EMAIL_TEMPLATES.CERTIFICATE,
    subject: 'Your internship certificate',
    link: ROUTES.CERTIFICATE,
    payload: {
      name: user.name,
      certificateNo: certificate.certificateNo,
      verifyUrl: verifyPathFor(certificate.certificateNo),
      resend: true,
    },
  });
  addAudit({
    actorId: admin?._id,
    action: 'CERTIFICATE_EMAIL_RESENT',
    entityType: 'Certificate',
    entityId: certificate._id,
    before,
    after: { emailStatus: EMAIL_STATUS.PENDING },
  });
  const certificateId = certificate._id;
  runLater(() => {
    const current = findCertificate(certificateId);
    if (current?.emailStatus === EMAIL_STATUS.PENDING) current.emailStatus = EMAIL_STATUS.SENT;
  }, CERTIFICATE_EMAIL_DELAY_MS);
  return {
    message: `The certificate email was queued for ${user.email}.`,
    emailStatus: EMAIL_STATUS.PENDING,
    job,
  };
}

// ===========================================================================
// Teams (SD10-SD12)
// ===========================================================================

function resolveTeamId(teamOrId) {
  if (!teamOrId) return null;
  return typeof teamOrId === 'object' ? (teamOrId._id ?? null) : String(teamOrId);
}

/** Members of a team excluding REMOVED (cancelled) invites. */
export function teamMembersOf(teamOrId) {
  const teamId = resolveTeamId(teamOrId);
  if (!teamId) return [];
  return db.teamMembers.filter(
    (member) => member.teamId === teamId && member.status !== MEMBER_STATUS.REMOVED,
  );
}

function joinedCount(teamId) {
  return db.teamMembers.filter(
    (member) => member.teamId === teamId && member.status === MEMBER_STATUS.JOINED,
  ).length;
}

/** True when the user is a JOINED member (the leader is a JOINED member too). */
export function isTeamMember(teamOrId, userId) {
  const teamId = resolveTeamId(teamOrId);
  if (!teamId || !userId) return false;
  return db.teamMembers.some(
    (member) =>
      member.teamId === teamId && member.userId === userId && member.status === MEMBER_STATUS.JOINED,
  );
}

export function isTeamLeader(teamOrId, userId) {
  const team = teamOrId && typeof teamOrId === 'object' ? teamOrId : findTeam(teamOrId);
  return Boolean(team && userId && team.leaderId === userId);
}

/** GET /teams/:id access: the leader or a JOINED member (others get 403). */
export function canViewTeam(team, user) {
  return Boolean(team && user && (isTeamLeader(team, user._id) || isTeamMember(team, user._id)));
}

/** Teams the user leads or has joined, newest first. */
export function teamsForUser(userId) {
  if (!userId) return [];
  const joinedTeamIds = new Set(
    db.teamMembers
      .filter((member) => member.userId === userId && member.status === MEMBER_STATUS.JOINED)
      .map((member) => member.teamId),
  );
  return sortByTime(
    db.teams.filter((team) => team.leaderId === userId || joinedTeamIds.has(team._id)),
    'createdAt',
    'desc',
  );
}

const MEMBER_ORDER = [
  MEMBER_STATUS.JOINED,
  MEMBER_STATUS.INVITED,
  MEMBER_STATUS.DECLINED,
  MEMBER_STATUS.REMOVED,
];

function sortMembers(members) {
  return [...members].sort((a, b) => {
    if (Boolean(a.isLeader) !== Boolean(b.isLeader)) return a.isLeader ? -1 : 1;
    const byStatus = MEMBER_ORDER.indexOf(a.status) - MEMBER_ORDER.indexOf(b.status);
    if (byStatus !== 0) return byStatus;
    return toTime(a.invitedAt) - toTime(b.invitedAt);
  });
}

/** TeamMember { _id, teamId, userId, name, email, status, isLeader, invitedAt, joinedAt, inviteExpiresAt } (never the token). */
export function teamMemberDto(member) {
  if (!member) return null;
  const user = member.userId ? findUser(member.userId) : null;
  return {
    _id: member._id,
    teamId: member.teamId,
    userId: member.userId ?? null,
    name: user?.name ?? null,
    email: member.email,
    status: member.status,
    isLeader: Boolean(member.isLeader),
    invitedAt: member.invitedAt ?? null,
    joinedAt: member.joinedAt ?? null,
    inviteExpiresAt: member.inviteExpiresAt ?? null,
  };
}

/** Team { _id, name, leaderId, leader, planId, plan, repoUrl, status, members, createdAt } */
export function teamDto(team) {
  if (!team) return null;
  return {
    _id: team._id,
    name: team.name,
    leaderId: team.leaderId,
    leader: userRef(team.leaderId),
    planId: team.planId,
    plan: planRef(team.planId),
    repoUrl: team.repoUrl ?? null,
    status: team.status,
    members: sortMembers(teamMembersOf(team._id)).map(teamMemberDto),
    createdAt: team.createdAt ?? null,
  };
}

function teamSummaryRef(team) {
  return team ? { _id: team._id, name: team.name, membersCount: joinedCount(team._id) } : null;
}

/** GET /admin/teams row: { _id, name, status, leader, membersCount, plan } */
export function adminTeamDto(team) {
  if (!team) return null;
  return {
    _id: team._id,
    name: team.name,
    status: team.status,
    leader: userRef(team.leaderId),
    membersCount: joinedCount(team._id),
    plan: planRef(team.planId),
  };
}

/** SD11: "paid" = the member has an enrollment for this team with a SUCCESS payment. */
function memberHasPaid(teamId, userId) {
  return db.enrollments.some(
    (enrollment) =>
      enrollment.userId === userId &&
      enrollment.teamId === teamId &&
      hasSuccessfulPayment(enrollment._id),
  );
}

/**
 * SD11 readiness: { teamId, status, ready, members: [{ memberId, userId, name, email, isLeader,
 * status, joined, assessed, paid }] }. DECLINED and REMOVED members are left out. Ready = at
 * least 2 members and every one of them joined, assessed and paid.
 */
export function teamReadiness(team) {
  if (!team) return null;
  const plan = findPlan(team.planId);
  const members = sortMembers(
    teamMembersOf(team._id).filter((member) => member.status !== MEMBER_STATUS.DECLINED),
  ).map((member) => {
    const userId = member.userId ?? null;
    const user = userId ? findUser(userId) : null;
    return {
      memberId: member._id,
      userId,
      name: user?.name ?? null,
      email: member.email,
      isLeader: Boolean(member.isLeader),
      status: member.status,
      joined: member.status === MEMBER_STATUS.JOINED,
      assessed: Boolean(userId && plan && findAttempt(userId, plan.designationId)),
      paid: Boolean(userId && memberHasPaid(team._id, userId)),
    };
  });
  const ready =
    members.length >= MIN_TEAM_SIZE &&
    members.every((member) => member.joined && member.assessed && member.paid);
  return { teamId: team._id, status: team.status, ready, members };
}

/** SD11: when every member is ready the team goes FORMING -> READY -> ACTIVE and gets its shared progress. */
export function refreshTeamStatus(team) {
  if (!team) return null;
  if (team.status === TEAM_STATUS.ACTIVE || team.status === TEAM_STATUS.DISBANDED) return team;
  if (!teamReadiness(team).ready) return team;
  team.status = TEAM_STATUS.READY;
  team.updatedAt = nowIso();
  // Nothing else gates the start, so a ready team becomes active straight away.
  team.status = TEAM_STATUS.ACTIVE;
  createProgressForTeam(team);
  return team;
}

/** SD10: creates a FORMING team; the creator is its leader (a JOINED member). */
export function createTeam({ user, name, planId }) {
  if (!user) throw unauthenticatedError();
  const teamName = String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const plan = findPlan(planId);
  const details = [];
  if (teamName.length < 3) {
    details.push(fieldError('name', 'Use at least 3 characters for the team name.'));
  } else if (teamName.length > 60) {
    details.push(fieldError('name', 'Keep the team name under 60 characters.'));
  }
  if (!plan || plan.status !== PUBLISH_STATUS.PUBLISHED) {
    details.push(fieldError('planId', 'Choose an available internship plan.'));
  }
  if (details.length > 0) throw validationFailure(details);

  const now = nowIso();
  const team = {
    _id: oid(),
    name: teamName,
    leaderId: user._id,
    planId: plan._id,
    repoUrl: null,
    status: TEAM_STATUS.FORMING,
    createdAt: now,
    updatedAt: now,
  };
  db.teams.push(team);
  db.teamMembers.push({
    _id: oid(),
    teamId: team._id,
    userId: user._id,
    email: normalizeEmail(user.email),
    status: MEMBER_STATUS.JOINED,
    isLeader: true,
    inviteToken: null,
    invitedAt: now,
    joinedAt: now,
    inviteExpiresAt: null,
  });
  return team;
}

function queueInviteEmail(member, team, inviter) {
  const inviterName = inviter?.name || 'Your team leader';
  return queueEmail({
    to: member.email,
    template: EMAIL_TEMPLATES.TEAM_INVITE,
    subject: `${inviterName} invited you to join ${team.name}`,
    link: paths.teamInvite(member.inviteToken),
    payload: {
      teamId: team._id,
      teamName: team.name,
      inviterName,
      plan: planLabel(team.planId),
      expiresAt: member.inviteExpiresAt,
    },
  });
}

function emailList(emails) {
  const raw = Array.isArray(emails) ? emails : String(emails ?? '').split(/[,;\s]+/);
  return [...new Set(raw.map(normalizeEmail).filter(Boolean))];
}

function assertLeader(team, user, message = 'Only the team leader can do this.') {
  if (!team) throw notFoundError('Team');
  if (!user) throw unauthenticatedError();
  if (!isTeamLeader(team, user._id)) throw forbiddenError(message);
}

/**
 * SD10: invites people by email (leader only, team FORMING). Max 5 members incl. the leader,
 * counting INVITED + JOINED (422 TEAM_FULL); an email that is already invited or joined is a
 * 409 DUPLICATE_INVITE; the leader's own email and malformed emails are 422 VALIDATION_ERROR.
 * Invites expire after 7 days; an invite email is queued per person.
 * Returns the INVITED member docs (respond with `{ items: members.map(teamMemberDto) }`).
 */
export function inviteToTeam({ user, team, emails }) {
  assertLeader(team, user, 'Only the team leader can invite members.');
  if (team.status !== TEAM_STATUS.FORMING) {
    throw invalidTransition('Invites can only be sent while the team is forming.');
  }
  const requested = emailList(emails);
  if (requested.length === 0) {
    throw validationFailure([fieldError('emails', 'Add at least one email address.')]);
  }

  const ownEmail = normalizeEmail(user.email);
  const details = [];
  requested.forEach((email) => {
    if (!isValidEmailAddress(email)) {
      details.push(fieldError('emails', `${email} is not a valid email address.`));
    } else if (email === ownEmail) {
      details.push(fieldError('emails', "You're already in this team, so you can't invite yourself."));
    }
  });
  if (details.length > 0) throw validationFailure(details);

  const records = db.teamMembers.filter((member) => member.teamId === team._id);
  const holdsSeat = (member) => SEAT_MEMBER_STATUSES.includes(member.status);
  const duplicates = requested.filter((email) =>
    records.some((member) => normalizeEmail(member.email) === email && holdsSeat(member)),
  );
  if (duplicates.length > 0) {
    throw httpError(
      409,
      'DUPLICATE_INVITE',
      duplicates.length === 1
        ? `${duplicates[0]} has already been invited.`
        : 'Some of these people have already been invited.',
      duplicates.map((email) => fieldError('emails', `${email} has already been invited.`)),
    );
  }

  const seatsTaken = records.filter(holdsSeat).length;
  if (seatsTaken + requested.length > TEAM_MAX_MEMBERS) {
    const left = Math.max(0, TEAM_MAX_MEMBERS - seatsTaken);
    throw httpError(
      422,
      'TEAM_FULL',
      `A team can have at most ${TEAM_MAX_MEMBERS} members including the leader.`,
      [
        fieldError(
          'emails',
          left > 0
            ? `You can invite ${left} more ${pluralWord(left, 'person', 'people')}.`
            : 'Your team is full.',
        ),
      ],
    );
  }

  const now = nowIso();
  const inviter = findUser(team.leaderId) ?? user;
  const invited = requested.map((email) => {
    // A DECLINED or REMOVED record for the same email is re-used, so the table has one row per person.
    const existing = records.find((member) => normalizeEmail(member.email) === email);
    const member = existing ?? { _id: oid(), teamId: team._id, email, isLeader: false };
    Object.assign(member, {
      email,
      userId: findUserByEmail(email)?._id ?? null,
      status: MEMBER_STATUS.INVITED,
      isLeader: false,
      inviteToken: makeToken('inv'),
      invitedAt: now,
      joinedAt: null,
      inviteExpiresAt: addDays(now, INVITE_EXPIRY_DAYS),
    });
    if (!existing) db.teamMembers.push(member);
    queueInviteEmail(member, team, inviter);
    return member;
  });
  team.updatedAt = now;
  return invited;
}

function findTeamInvite(team, inviteId) {
  const member = db.teamMembers.find(
    (candidate) => candidate._id === inviteId && candidate.teamId === team._id,
  );
  if (!member) throw notFoundError('Invite');
  return member;
}

/** SD10: leader re-sends a pending invite with a fresh token and a new 7-day expiry. */
export function resendInvite({ user, team, inviteId }) {
  assertLeader(team, user, 'Only the team leader can manage invites.');
  const member = findTeamInvite(team, inviteId);
  if (member.status !== MEMBER_STATUS.INVITED) {
    throw invalidTransition('Only pending invites can be resent.');
  }
  const now = nowIso();
  member.inviteToken = makeToken('inv');
  member.inviteExpiresAt = addDays(now, INVITE_EXPIRY_DAYS);
  if (!member.userId) member.userId = findUserByEmail(member.email)?._id ?? null;
  queueInviteEmail(member, team, findUser(team.leaderId) ?? user);
  team.updatedAt = now;
  return member;
}

/** SD10: leader cancels an invite (status REMOVED). Joined members and the leader stay. */
export function cancelInvite({ user, team, inviteId }) {
  assertLeader(team, user, 'Only the team leader can manage invites.');
  const member = findTeamInvite(team, inviteId);
  if (member.isLeader) throw invalidTransition("The team leader can't be removed.");
  if (member.status === MEMBER_STATUS.REMOVED) return member;
  if (member.status === MEMBER_STATUS.JOINED) {
    throw invalidTransition('Members who have already joined cannot be removed here.');
  }
  member.status = MEMBER_STATUS.REMOVED;
  team.updatedAt = nowIso();
  // The remaining members may now all be ready.
  refreshTeamStatus(team);
  return member;
}

/** GET /teams/invites/:token: { token, email, status, expiresAt, expired, team: { _id, name, leader: { name }, plan, membersCount } } */
export function inviteDetailsDto(member) {
  if (!member) return null;
  const team = findTeam(member.teamId);
  const leader = team ? findUser(team.leaderId) : null;
  return {
    token: member.inviteToken,
    email: member.email,
    status: member.status,
    expiresAt: member.inviteExpiresAt ?? null,
    expired: member.status === MEMBER_STATUS.INVITED && isExpired(member.inviteExpiresAt),
    team: team
      ? {
          _id: team._id,
          name: team.name,
          leader: { name: leader?.name ?? null },
          plan: planRef(team.planId),
          membersCount: joinedCount(team._id),
        }
      : null,
  };
}

/** SD11: invitee accepts (same email required). 410 INVITE_EXPIRED, 403 email mismatch. Returns the team. */
export function acceptInvite({ user, token }) {
  if (!user) throw unauthenticatedError();
  const member = findInviteByToken(token);
  if (!member) throw notFoundError('Invite');
  const team = findTeam(member.teamId);
  if (!team) throw notFoundError('Team');
  if (member.status === MEMBER_STATUS.JOINED) {
    if (member.userId === user._id) return team;
    throw invalidTransition('This invite has already been used.');
  }
  if (member.status !== MEMBER_STATUS.INVITED) {
    throw invalidTransition(
      member.status === MEMBER_STATUS.DECLINED
        ? 'You declined this invite. Ask the team leader to invite you again.'
        : 'This invite was cancelled by the team leader.',
    );
  }
  if (isExpired(member.inviteExpiresAt)) {
    throw httpError(410, 'INVITE_EXPIRED', 'This invite has expired. Ask your team leader to send a new one.');
  }
  if (normalizeEmail(user.email) !== normalizeEmail(member.email)) {
    throw forbiddenError(`This invite was sent to ${member.email}. Log in with that email to accept it.`);
  }
  if (team.status !== TEAM_STATUS.FORMING) {
    throw invalidTransition('This team is no longer accepting new members.');
  }
  const now = nowIso();
  member.status = MEMBER_STATUS.JOINED;
  member.userId = user._id;
  member.joinedAt = now;
  team.updatedAt = now;
  refreshTeamStatus(team);
  return team;
}

/** SD11: invitee declines (same email required). Returns the member doc. */
export function declineInvite({ user, token }) {
  if (!user) throw unauthenticatedError();
  const member = findInviteByToken(token);
  if (!member) throw notFoundError('Invite');
  if (normalizeEmail(user.email) !== normalizeEmail(member.email)) {
    throw forbiddenError('This invite was sent to a different email address.');
  }
  if (member.status === MEMBER_STATUS.DECLINED) return member;
  if (member.status !== MEMBER_STATUS.INVITED) {
    throw invalidTransition('This invite can no longer be declined.');
  }
  member.status = MEMBER_STATUS.DECLINED;
  member.userId = user._id;
  const team = findTeam(member.teamId);
  if (team) {
    team.updatedAt = nowIso();
    refreshTeamStatus(team);
  }
  return member;
}

/** SD11: leader saves the shared repository URL (only the URL is stored, never a password). */
export function setTeamRepo({ user, team, repoUrl }) {
  assertLeader(team, user, 'Only the team leader can change the repository.');
  const url = String(repoUrl ?? '')
    .trim()
    .replace(/\/+$/, '');
  if (!GITHUB_URL_RE.test(url)) {
    throw validationFailure([
      fieldError('repoUrl', 'Use a repository link that starts with https://github.com/'),
    ]);
  }
  team.repoUrl = url;
  team.updatedAt = nowIso();
  return team;
}

/** SD12: GET /teams/:id/progress: { teamId, tasks: TaskProgress[], contributions: [{ userId, name, submissions, lastSubmittedAt }] } */
export function teamProgressDto(team) {
  if (!team) return null;
  const tasks = sortProgressBySequence(progressInScope({ teamId: team._id }));
  const progressIds = new Set(tasks.map((progress) => progress._id));
  const submissions = db.taskSubmissions.filter((submission) =>
    progressIds.has(submission.taskProgressId),
  );
  const contributions = sortMembers(teamMembersOf(team._id))
    .filter((member) => member.status === MEMBER_STATUS.JOINED && member.userId)
    .map((member) => {
      const mine = submissions.filter((submission) => submission.submittedBy === member.userId);
      return {
        userId: member.userId,
        name: findUser(member.userId)?.name ?? member.email,
        submissions: mine.length,
        lastSubmittedAt: latestBy(mine, 'submittedAt')?.submittedAt ?? null,
      };
    });
  return { teamId: team._id, tasks: tasks.map(progressDto), contributions };
}

// ===========================================================================
// Trainer assignments and review queue (MM13)
// ===========================================================================

/** The active assignment covering a team (preferred) or an enrollment, or null. */
export function activeAssignmentFor({ enrollmentId, teamId } = {}) {
  const active = db.trainerAssignments.filter((assignment) => assignment.active);
  if (teamId) {
    const forTeam = latestBy(
      active.filter((assignment) => assignment.teamId === teamId),
      'assignedAt',
    );
    if (forTeam) return forTeam;
  }
  if (enrollmentId) {
    const forEnrollment = latestBy(
      active.filter((assignment) => assignment.enrollmentId === enrollmentId && !assignment.teamId),
      'assignedAt',
    );
    if (forEnrollment) return forEnrollment;
  }
  return null;
}

/** A trainer's active assignments. */
export function assignmentsForTrainer(trainerId) {
  if (!trainerId) return [];
  return db.trainerAssignments.filter(
    (assignment) => assignment.active && assignment.trainerId === trainerId,
  );
}

/** Enrollment and team ids a trainer may review (an enrollment assignment also covers its team). */
function trainerScope(trainerId) {
  const scope = { enrollmentIds: new Set(), teamIds: new Set() };
  assignmentsForTrainer(trainerId).forEach((assignment) => {
    if (assignment.teamId) {
      scope.teamIds.add(assignment.teamId);
      return;
    }
    if (!assignment.enrollmentId) return;
    scope.enrollmentIds.add(assignment.enrollmentId);
    const enrollment = findEnrollment(assignment.enrollmentId);
    if (enrollment?.teamId) scope.teamIds.add(enrollment.teamId);
  });
  return scope;
}

function submissionInScope(submission, scope) {
  const progress = findProgress(submission.taskProgressId);
  if (progress?.teamId && scope.teamIds.has(progress.teamId)) return true;
  const enrollmentId = submission.enrollmentId ?? progress?.enrollmentId;
  return Boolean(enrollmentId) && scope.enrollmentIds.has(enrollmentId);
}

/** MM13: a trainer only sees submissions of enrollments or teams assigned to them. */
export function trainerCanAccessSubmission(trainerId, submission) {
  if (!trainerId || !submission) return false;
  return submissionInScope(submission, trainerScope(trainerId));
}

/** MM13: the trainer's submissions, oldest first. `status` filters by reviewStatus ('ALL' = none). */
export function submissionsForTrainer(trainerId, { status } = {}) {
  if (!trainerId) return [];
  const wanted = status ? String(status).toUpperCase() : null;
  const filter = wanted && wanted !== 'ALL' ? wanted : null;
  const scope = trainerScope(trainerId);
  return sortByTime(
    db.taskSubmissions.filter(
      (submission) =>
        (!filter || submission.reviewStatus === filter) && submissionInScope(submission, scope),
    ),
    'submittedAt',
  );
}

function nextPendingSubmissionId(trainerId, excludeId) {
  const next = submissionsForTrainer(trainerId, { status: REVIEW_STATUS.PENDING }).find(
    (submission) => submission._id !== excludeId,
  );
  return next?._id ?? null;
}

function submissionContext(submission) {
  const progress = findProgress(submission.taskProgressId) ?? null;
  const task = progress ? (findTaskDefinition(progress.taskId) ?? null) : null;
  const enrollment = findEnrollment(submission.enrollmentId ?? progress?.enrollmentId) ?? null;
  const team = progress?.teamId ? (findTeam(progress.teamId) ?? null) : null;
  return { progress, task, enrollment, team };
}

/** GET /trainer/submissions row: { _id, attemptNumber, submittedAt, reviewStatus, submittedBy, student, team, task, enrollmentId, taskProgressId } */
export function trainerSubmissionListItemDto(submission) {
  if (!submission) return null;
  const { progress, task, enrollment, team } = submissionContext(submission);
  return {
    _id: submission._id,
    attemptNumber: Number(submission.attemptNumber) || 1,
    submittedAt: submission.submittedAt ?? null,
    reviewStatus: submission.reviewStatus ?? REVIEW_STATUS.PENDING,
    submittedBy: nameRef(submission.submittedBy),
    student: team ? null : userRef(enrollment?.userId),
    team: teamSummaryRef(team),
    task: task ? { _id: task._id, title: task.title ?? '', sequence: Number(task.sequence) || 0 } : null,
    enrollmentId: submission.enrollmentId ?? progress?.enrollmentId ?? null,
    taskProgressId: submission.taskProgressId,
  };
}

/**
 * GET /trainer/submissions/:id body: Submission + task (with acceptance criteria) + student or
 * team + plan + previousAttempts (newest first) + automatedChecks + nextPendingId.
 * Pass the viewing trainer's id so nextPendingId comes from their own queue.
 */
export function trainerSubmissionDetailDto(submission, trainerId) {
  if (!submission) return null;
  const { task, enrollment, team } = submissionContext(submission);
  const reviewerId =
    trainerId ?? activeAssignmentFor({ enrollmentId: enrollment?._id, teamId: team?._id })?.trainerId ?? null;
  return {
    ...submissionDto(submission),
    task: task
      ? {
          _id: task._id,
          title: task.title ?? '',
          sequence: Number(task.sequence) || 0,
          problemStatement: task.problemStatement ?? '',
          expectedOutcome: task.expectedOutcome ?? '',
          acceptanceCriteria: Array.isArray(task.acceptanceCriteria) ? [...task.acceptanceCriteria] : [],
          starterRepoUrl: task.starterRepoUrl ?? null,
          requiresTrainerReview: task.requiresTrainerReview !== false,
        }
      : null,
    student: team ? null : userRef(enrollment?.userId),
    team: teamSummaryRef(team),
    plan: planRef(enrollment?.planId ?? team?.planId),
    previousAttempts: submissionsForProgress(submission.taskProgressId)
      .filter((other) => other._id !== submission._id)
      .map(submissionDto),
    automatedChecks: (submission.automatedChecks || []).map((check) => ({
      name: check.name,
      status: check.status,
      required: Boolean(check.required),
    })),
    nextPendingId: reviewerId ? nextPendingSubmissionId(reviewerId, submission._id) : null,
  };
}

function assignmentProgress(assignment) {
  if (assignment.teamId) return progressInScope({ teamId: assignment.teamId });
  const enrollment = findEnrollment(assignment.enrollmentId);
  return enrollment ? listProgressForEnrollment(enrollment) : [];
}

/** Latest student activity (task started or submitted) across a progress list. */
function lastActivityFor(progressList, fallback) {
  const progressIds = new Set(progressList.map((progress) => progress._id));
  const moments = [];
  progressList.forEach((progress) => moments.push(progress.startedAt, progress.submittedAt));
  db.taskSubmissions.forEach((submission) => {
    if (progressIds.has(submission.taskProgressId)) moments.push(submission.submittedAt);
  });
  const latest = moments
    .filter(Boolean)
    .reduce((best, moment) => (!best || toTime(moment) > toTime(best) ? moment : best), null);
  return latest ?? fallback ?? null;
}

/** GET /trainer/assignments row: { _id, type, enrollmentId, teamId, student, team, plan, approvedTasks, totalTasks, pendingSubmissions, lastActivityAt } */
export function trainerAssignmentViewDto(assignment) {
  if (!assignment) return null;
  const isTeam = Boolean(assignment.teamId);
  const team = isTeam ? (findTeam(assignment.teamId) ?? null) : null;
  const enrollment = isTeam ? null : (findEnrollment(assignment.enrollmentId) ?? null);
  const progressList = assignmentProgress(assignment);
  const progressIds = new Set(progressList.map((progress) => progress._id));
  return {
    _id: assignment._id,
    type: isTeam ? ENROLLMENT_TYPE.TEAM : ENROLLMENT_TYPE.INDIVIDUAL,
    enrollmentId: assignment.enrollmentId ?? null,
    teamId: assignment.teamId ?? null,
    student: enrollment ? userRef(enrollment.userId) : null,
    team: teamSummaryRef(team),
    plan: planRef(isTeam ? team?.planId : enrollment?.planId),
    approvedTasks: progressList.filter(isApproved).length,
    totalTasks: progressList.length,
    pendingSubmissions: db.taskSubmissions.filter(
      (submission) =>
        progressIds.has(submission.taskProgressId) && submission.reviewStatus === REVIEW_STATUS.PENDING,
    ).length,
    lastActivityAt: lastActivityFor(progressList, enrollment?.activatedAt ?? team?.updatedAt ?? null),
  };
}

/**
 * Admin assignment row (not detailed in the contract):
 * { _id, type, trainerId, trainer, enrollmentId, enrollment: { _id, status, enrollmentType,
 *   student, plan } | null, teamId, team: { _id, name, status, membersCount, leader, plan } | null,
 *   assignedBy, assignedAt, active, unassignedAt }
 */
export function adminAssignmentDto(assignment) {
  if (!assignment) return null;
  const enrollment = assignment.enrollmentId ? (findEnrollment(assignment.enrollmentId) ?? null) : null;
  const team = assignment.teamId ? (findTeam(assignment.teamId) ?? null) : null;
  return {
    _id: assignment._id,
    type: assignment.teamId ? ENROLLMENT_TYPE.TEAM : ENROLLMENT_TYPE.INDIVIDUAL,
    trainerId: assignment.trainerId,
    trainer: userRef(assignment.trainerId),
    enrollmentId: assignment.enrollmentId ?? null,
    enrollment: enrollment
      ? {
          _id: enrollment._id,
          status: enrollment.status,
          enrollmentType: enrollment.enrollmentType ?? ENROLLMENT_TYPE.INDIVIDUAL,
          student: userRef(enrollment.userId),
          plan: planRef(enrollment.planId),
        }
      : null,
    teamId: assignment.teamId ?? null,
    team: team
      ? {
          _id: team._id,
          name: team.name,
          status: team.status,
          membersCount: joinedCount(team._id),
          leader: userRef(team.leaderId),
          plan: planRef(team.planId),
        }
      : null,
    assignedBy: userRef(assignment.assignedBy),
    assignedAt: assignment.assignedAt ?? null,
    active: Boolean(assignment.active),
    unassignedAt: assignment.unassignedAt ?? null,
  };
}

/** GET /trainer/stats: { pending, changesRequested, reviewedToday, assignedStudents, assignedTeams } */
export function computeTrainerStats(trainerId) {
  const assignments = assignmentsForTrainer(trainerId);
  const seen = new Set();
  let changesRequested = 0;
  assignments.forEach((assignment) => {
    assignmentProgress(assignment).forEach((progress) => {
      if (seen.has(progress._id)) return;
      seen.add(progress._id);
      if (progress.status === TASK_STATUS.CHANGES_REQUESTED) changesRequested += 1;
    });
  });
  const today = new Date().toDateString();
  return {
    pending: submissionsForTrainer(trainerId, { status: REVIEW_STATUS.PENDING }).length,
    changesRequested,
    reviewedToday: db.reviews.filter(
      (review) =>
        review.trainerId === trainerId &&
        Boolean(review.reviewedAt) &&
        new Date(review.reviewedAt).toDateString() === today,
    ).length,
    assignedStudents: assignments.filter((assignment) => !assignment.teamId).length,
    assignedTeams: assignments.filter((assignment) => Boolean(assignment.teamId)).length,
  };
}

/**
 * MM13: assigns a trainer to ONE enrollment or ONE team. The previous active assignment of the
 * same target is closed (history kept). Re-assigning the same trainer is a no-op. Audited.
 */
export function assignTrainer({ admin, trainerId, enrollmentId, teamId }) {
  const targetEnrollmentId = enrollmentId || null;
  const targetTeamId = teamId || null;
  const trainer = findUser(trainerId);
  const details = [];
  if (!trainer || !userHasRole(trainer, ROLES.TRAINER) || trainer.status === USER_STATUS.SUSPENDED) {
    details.push(fieldError('trainerId', 'Choose an active trainer.'));
  }
  if (!targetEnrollmentId && !targetTeamId) {
    details.push(fieldError('enrollmentId', 'Choose a student enrollment or a team.'));
  } else if (targetEnrollmentId && targetTeamId) {
    details.push(fieldError('teamId', 'Choose either an enrollment or a team, not both.'));
  }
  if (details.length > 0) throw validationFailure(details);
  if (targetEnrollmentId && !findEnrollment(targetEnrollmentId)) throw notFoundError('Enrollment');
  if (targetTeamId && !findTeam(targetTeamId)) throw notFoundError('Team');

  const current = db.trainerAssignments.filter(
    (assignment) =>
      assignment.active &&
      (targetTeamId
        ? assignment.teamId === targetTeamId
        : assignment.enrollmentId === targetEnrollmentId && !assignment.teamId),
  );
  if (current.length === 1 && current[0].trainerId === trainer._id) return current[0];

  const now = nowIso();
  current.forEach((assignment) => {
    assignment.active = false;
    assignment.unassignedAt = now;
  });
  const assignment = {
    _id: oid(),
    trainerId: trainer._id,
    enrollmentId: targetEnrollmentId,
    teamId: targetTeamId,
    assignedBy: admin?._id ?? null,
    assignedAt: now,
    active: true,
    unassignedAt: null,
  };
  db.trainerAssignments.push(assignment);
  addAudit({
    actorId: admin?._id,
    action: 'TRAINER_ASSIGNED',
    entityType: 'TrainerAssignment',
    entityId: assignment._id,
    before: current.length > 0 ? { trainerIds: current.map((previous) => previous.trainerId) } : null,
    after: { trainerId: trainer._id, enrollmentId: targetEnrollmentId, teamId: targetTeamId },
  });
  return assignment;
}

/** MM13: closes an assignment (active:false, history kept). Audited. */
export function unassignTrainer({ admin, assignmentId }) {
  const assignment = findAssignment(assignmentId);
  if (!assignment) throw notFoundError('Assignment');
  if (!assignment.active) return assignment;
  assignment.active = false;
  assignment.unassignedAt = nowIso();
  addAudit({
    actorId: admin?._id,
    action: 'TRAINER_UNASSIGNED',
    entityType: 'TrainerAssignment',
    entityId: assignment._id,
    before: { active: true, trainerId: assignment.trainerId },
    after: { active: false },
  });
  return assignment;
}

// ===========================================================================
// Admin configuration: plans (MM5), assessment configs (MM6), schedules (MM9), tasks (MM10)
// ===========================================================================

function planAuditSnapshot(plan) {
  return {
    designationId: plan.designationId,
    domainId: plan.domainId,
    durationMonths: plan.durationMonths,
    basePrice: plan.basePrice,
    currency: plan.currency,
    status: plan.status,
  };
}

/** MM5 field rules; with `partial`, only the fields that are present are checked. */
function validatePlanFields(fields, { partial = false } = {}) {
  const details = [];
  const present = (key) => !partial || fields[key] !== undefined;
  if (present('designationId') && !findDesignation(fields.designationId)) {
    details.push(fieldError('designationId', 'Choose a designation.'));
  }
  if (present('domainId') && !findDomain(fields.domainId)) {
    details.push(fieldError('domainId', 'Choose a domain.'));
  }
  if (present('durationMonths') && !DURATION_OPTIONS.includes(Number(fields.durationMonths))) {
    details.push(fieldError('durationMonths', 'Choose 1, 2, 3, 4 or 6 months.'));
  }
  if (present('basePrice')) {
    const price = Number(fields.basePrice);
    if (isBlank(fields.basePrice) || !Number.isInteger(price) || price <= 0) {
      details.push(fieldError('basePrice', 'Enter a base price greater than zero (in paise).'));
    } else if (price > MAX_PLAN_PRICE_PAISE) {
      details.push(fieldError('basePrice', `Enter a price up to ${formatRupees(MAX_PLAN_PRICE_PAISE)}.`));
    }
  }
  return details;
}

/** MM5: 409 DUPLICATE_PLAN for an existing (designation, domain, duration) combination. */
function assertUniquePlan({ designationId, domainId, durationMonths }, excludeId = null) {
  const clash = db.internshipPlans.find(
    (plan) =>
      plan._id !== excludeId &&
      plan.designationId === designationId &&
      plan.domainId === domainId &&
      Number(plan.durationMonths) === Number(durationMonths),
  );
  if (clash) {
    throw httpError(
      409,
      'DUPLICATE_PLAN',
      'A plan for this designation, domain and duration already exists.',
      [fieldError('durationMonths', 'This designation, domain and duration already has a plan.')],
    );
  }
}

/** MM5: creates a plan (DRAFT unless status PUBLISHED is given). basePrice is integer paise. */
export function createPlan({ admin, designationId, domainId, durationMonths, basePrice, status }) {
  const details = validatePlanFields({ designationId, domainId, durationMonths, basePrice });
  const nextStatus = status ? String(status).toUpperCase() : PUBLISH_STATUS.DRAFT;
  if (!Object.values(PUBLISH_STATUS).includes(nextStatus)) {
    details.push(fieldError('status', 'Status must be DRAFT or PUBLISHED.'));
  }
  if (details.length > 0) throw validationFailure(details);

  const designation = findDesignation(designationId);
  const domain = findDomain(domainId);
  const months = Number(durationMonths);
  assertUniquePlan({ designationId: designation._id, domainId: domain._id, durationMonths: months });

  const now = nowIso();
  const plan = {
    _id: oid(),
    designationId: designation._id,
    domainId: domain._id,
    durationMonths: months,
    basePrice: Number(basePrice),
    currency: CURRENCY,
    status: nextStatus,
    createdBy: admin?._id ?? null,
    updatedBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.internshipPlans.push(plan);
  addAudit({
    actorId: admin?._id,
    action: 'PLAN_CREATED',
    entityType: 'InternshipPlan',
    entityId: plan._id,
    after: planAuditSnapshot(plan),
  });
  return plan;
}

/**
 * MM5: updates basePrice / durationMonths / domainId. Price edits apply to NEW quotes only
 * (existing quotes and enrollments keep their snapshots). Audited as PRICE_UPDATED when the
 * price changes.
 */
export function updatePlan({ admin, plan, basePrice, durationMonths, domainId }) {
  if (!plan) throw notFoundError('Plan');
  const details = validatePlanFields({ basePrice, durationMonths, domainId }, { partial: true });
  if (details.length > 0) throw validationFailure(details);

  const next = {
    domainId: domainId !== undefined ? findDomain(domainId)._id : plan.domainId,
    durationMonths: durationMonths !== undefined ? Number(durationMonths) : Number(plan.durationMonths),
    basePrice: basePrice !== undefined ? Number(basePrice) : plan.basePrice,
  };
  assertUniquePlan(
    { designationId: plan.designationId, domainId: next.domainId, durationMonths: next.durationMonths },
    plan._id,
  );
  const before = planAuditSnapshot(plan);
  Object.assign(plan, next, { updatedBy: admin?._id ?? null, updatedAt: nowIso() });
  addAudit({
    actorId: admin?._id,
    action: before.basePrice !== plan.basePrice ? 'PRICE_UPDATED' : 'PLAN_UPDATED',
    entityType: 'InternshipPlan',
    entityId: plan._id,
    before,
    after: planAuditSnapshot(plan),
  });
  return plan;
}

/** MM5: publish / unpublish a plan (no hard delete). */
export function setPlanStatus({ admin, plan, status }) {
  if (!plan) throw notFoundError('Plan');
  const next = String(status ?? '').toUpperCase();
  if (!Object.values(PUBLISH_STATUS).includes(next)) {
    throw validationFailure([fieldError('status', 'Status must be DRAFT or PUBLISHED.')]);
  }
  if (plan.status === next) return plan;
  const before = { status: plan.status };
  plan.status = next;
  plan.updatedBy = admin?._id ?? null;
  plan.updatedAt = nowIso();
  addAudit({
    actorId: admin?._id,
    action: next === PUBLISH_STATUS.PUBLISHED ? 'PLAN_PUBLISHED' : 'PLAN_UNPUBLISHED',
    entityType: 'InternshipPlan',
    entityId: plan._id,
    before,
    after: { status: next },
  });
  return plan;
}

function sanitizeQuestions(questions) {
  const usedIds = new Set();
  return (Array.isArray(questions) ? questions : []).map((question) => {
    let id = typeof question?._id === 'string' && question._id.trim() ? question._id.trim() : null;
    if (!id || usedIds.has(id)) id = oid();
    usedIds.add(id);
    const marks = Number(question?.marks);
    return {
      _id: id,
      text: String(question?.text ?? '').trim(),
      options: Array.from({ length: ASSESSMENT_OPTION_COUNT }, (_, index) =>
        String(question?.options?.[index] ?? '').trim(),
      ),
      // Unset stays null so publishing reports "Mark the correct answer" instead of guessing.
      correctIndex: isIntegerInRange(question?.correctIndex, 0, ASSESSMENT_OPTION_COUNT - 1)
        ? Number(question.correctIndex)
        : null,
      marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
    };
  });
}

function sanitizeSlabs(slabs) {
  return (Array.isArray(slabs) ? slabs : []).map((slab) => ({
    minScore: toNumberOrNull(slab?.minScore),
    maxScore: toNumberOrNull(slab?.maxScore),
    discountPercent: toNumberOrNull(slab?.discountPercent),
  }));
}

function assessmentAuditSnapshot(config) {
  return {
    version: config.version,
    status: config.status,
    questionCount: Array.isArray(config.questions) ? config.questions.length : 0,
    discountSlabs: sanitizeSlabs(config.discountSlabs),
  };
}

/**
 * MM6: saves the admin's questions and slabs as a DRAFT. The current draft is updated in place;
 * if the latest version is published, a new draft version is created (published versions are
 * never edited). Drafts may be incomplete; publish validates them.
 */
export function saveAssessmentDraft({ admin, designationId, questions, discountSlabs }) {
  const designation = findDesignation(designationId);
  if (!designation) throw notFoundError('Designation');
  const details = [];
  if (!Array.isArray(questions)) {
    details.push(fieldError('questions', 'Questions must be a list.'));
  } else if (questions.length > ASSESSMENT_QUESTION_COUNT) {
    details.push(fieldError('questions', `An assessment has exactly ${ASSESSMENT_QUESTION_COUNT} questions.`));
  }
  if (discountSlabs !== undefined && discountSlabs !== null && !Array.isArray(discountSlabs)) {
    details.push(fieldError('discountSlabs', 'Discount slabs must be a list.'));
  }
  if (details.length > 0) throw validationFailure(details);

  const latest = getLatestAssessmentConfig(designation._id);
  const nextQuestions = sanitizeQuestions(questions);
  const nextSlabs = sanitizeSlabs(
    Array.isArray(discountSlabs) ? discountSlabs : (latest?.discountSlabs ?? DEFAULT_SLABS),
  );
  const before = latest ? assessmentAuditSnapshot(latest) : null;
  const now = nowIso();
  let config;
  if (latest && latest.status === SCHEDULE_STATUS.DRAFT) {
    Object.assign(latest, { questions: nextQuestions, discountSlabs: nextSlabs, updatedAt: now });
    config = latest;
  } else {
    config = {
      _id: oid(),
      designationId: designation._id,
      version: (Number(latest?.version) || 0) + 1,
      status: SCHEDULE_STATUS.DRAFT,
      questions: nextQuestions,
      discountSlabs: nextSlabs,
      createdBy: admin?._id ?? null,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };
    db.assessmentConfigs.push(config);
  }
  addAudit({
    actorId: admin?._id,
    action: 'ASSESSMENT_DRAFT_SAVED',
    entityType: 'AssessmentConfig',
    entityId: config._id,
    before,
    after: assessmentAuditSnapshot(config),
  });
  return config;
}

/**
 * MM6: publishes the latest draft as the live version (older published versions are archived).
 * 422 VALIDATION_ERROR unless there are exactly 15 valid questions and the slabs cover 0-15
 * without overlapping; 409 INVALID_TRANSITION when there is no draft to publish.
 */
export function publishAssessmentConfig({ admin, designationId }) {
  const designation = findDesignation(designationId);
  if (!designation) throw notFoundError('Designation');
  const latest = getLatestAssessmentConfig(designation._id);
  if (!latest) throw notFoundError('Assessment');
  if (latest.status !== SCHEDULE_STATUS.DRAFT) {
    throw invalidTransition('There are no unpublished changes. Edit the questions or slabs first.');
  }
  const details = [...validateQuestions(latest.questions), ...validateSlabs(latest.discountSlabs)];
  if (details.length > 0) {
    throw validationFailure(
      details,
      `Publishing needs ${ASSESSMENT_QUESTION_COUNT} complete questions and slabs that cover scores 0 to ${ASSESSMENT_MAX_SCORE} without overlapping.`,
    );
  }
  const now = nowIso();
  db.assessmentConfigs.forEach((config) => {
    if (
      config.designationId === designation._id &&
      config._id !== latest._id &&
      config.status === SCHEDULE_STATUS.PUBLISHED
    ) {
      config.status = SCHEDULE_STATUS.ARCHIVED;
      config.updatedAt = now;
    }
  });
  const before = assessmentAuditSnapshot(latest);
  latest.status = SCHEDULE_STATUS.PUBLISHED;
  latest.publishedAt = now;
  latest.updatedAt = now;
  addAudit({
    actorId: admin?._id,
    action: 'ASSESSMENT_PUBLISHED',
    entityType: 'AssessmentConfig',
    entityId: latest._id,
    before,
    after: assessmentAuditSnapshot(latest),
  });
  return latest;
}

/** MM9: SOP content is sanitised before saving (scripts, embeds, inline handlers removed). */
function sanitizeSopMarkdown(value) {
  return String(value ?? '')
    .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|style|iframe|object|embed)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

/** Days are numbered by their order (the editor reorders days). */
function sanitizeDays(days) {
  return (Array.isArray(days) ? days : []).map((day, index) => ({
    dayNumber: index + 1,
    title: String(day?.title ?? '').trim(),
    activity: String(day?.activity ?? '').trim(),
    sopContent: sanitizeSopMarkdown(day?.sopContent),
    requiredEvidence: String(day?.requiredEvidence ?? '').trim(),
  }));
}

function validateDays(days, { requireOne = false } = {}) {
  if (!Array.isArray(days)) return [fieldError('days', 'Days must be a list.')];
  const details = [];
  if (requireOne && days.length === 0) details.push(fieldError('days', 'Add at least one day.'));
  if (days.length > MAX_SCHEDULE_DAYS) {
    details.push(fieldError('days', `A schedule can have at most ${MAX_SCHEDULE_DAYS} days.`));
  }
  days.forEach((day, index) => {
    if (!String(day?.title ?? '').trim()) {
      details.push(fieldError(`days.${index}.title`, `Day ${index + 1} needs a title.`));
    }
  });
  return details;
}

/** All versions of the same designation / domain / duration combination. */
function templatesFor({ designationId, domainId, durationMonths }) {
  return db.scheduleTemplates.filter(
    (template) =>
      template.designationId === designationId &&
      template.domainId === domainId &&
      Number(template.durationMonths) === Number(durationMonths),
  );
}

function maxVersion(templates) {
  return templates.reduce((highest, template) => Math.max(highest, Number(template.version) || 0), 0);
}

function templateAuditSnapshot(template) {
  return {
    designationId: template.designationId,
    domainId: template.domainId,
    durationMonths: template.durationMonths,
    version: template.version,
    status: template.status,
    daysCount: Array.isArray(template.days) ? template.days.length : 0,
  };
}

/** MM9: published (and archived) versions are immutable: 409 TEMPLATE_PUBLISHED. */
function assertTemplateEditable(template) {
  if (template.status !== SCHEDULE_STATUS.DRAFT) {
    throw httpError(
      409,
      'TEMPLATE_PUBLISHED',
      'Published versions are locked. Create a new draft from this version to make changes.',
    );
  }
}

/** All versions of a template's combination, newest first. */
export function scheduleVersionsOf(template) {
  if (!template) return [];
  return [...templatesFor(template)].sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

/** MM9: creates a DRAFT template; its version is the next number for the combination. */
export function createScheduleTemplate({ admin, designationId, domainId, durationMonths, days = [] }) {
  const designation = findDesignation(designationId);
  const domain = findDomain(domainId);
  const months = Number(durationMonths);
  const details = [];
  if (!designation) details.push(fieldError('designationId', 'Choose a designation.'));
  if (!domain) details.push(fieldError('domainId', 'Choose a domain.'));
  if (!DURATION_OPTIONS.includes(months)) {
    details.push(fieldError('durationMonths', 'Choose 1, 2, 3, 4 or 6 months.'));
  }
  details.push(...validateDays(days ?? []));
  if (details.length > 0) throw validationFailure(details);

  const key = { designationId: designation._id, domainId: domain._id, durationMonths: months };
  const versions = templatesFor(key);
  const draft = versions.find((template) => template.status === SCHEDULE_STATUS.DRAFT);
  if (draft) {
    throw httpError(
      409,
      'DRAFT_EXISTS',
      `Version ${draft.version} of this schedule is already a draft. Open it to keep editing.`,
    );
  }
  const now = nowIso();
  const template = {
    _id: oid(),
    ...key,
    version: maxVersion(versions) + 1,
    status: SCHEDULE_STATUS.DRAFT,
    days: sanitizeDays(days ?? []),
    createdBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
  db.scheduleTemplates.push(template);
  addAudit({
    actorId: admin?._id,
    action: 'SCHEDULE_CREATED',
    entityType: 'ScheduleTemplate',
    entityId: template._id,
    after: templateAuditSnapshot(template),
  });
  return template;
}

/** MM9: replaces the days of a DRAFT template (409 TEMPLATE_PUBLISHED when published). */
export function updateScheduleTemplate({ admin, template, days }) {
  if (!template) throw notFoundError('Schedule');
  assertTemplateEditable(template);
  const details = validateDays(days);
  if (details.length > 0) throw validationFailure(details);
  const before = templateAuditSnapshot(template);
  template.days = sanitizeDays(days);
  template.updatedAt = nowIso();
  addAudit({
    actorId: admin?._id,
    action: 'SCHEDULE_UPDATED',
    entityType: 'ScheduleTemplate',
    entityId: template._id,
    before,
    after: templateAuditSnapshot(template),
  });
  return template;
}

/**
 * MM9/MM10: locks a DRAFT as the next published version (with its tasks). Older published
 * versions are archived; enrollments keep the version they were assigned.
 */
export function publishScheduleTemplate({ admin, template }) {
  if (!template) throw notFoundError('Schedule');
  assertTemplateEditable(template);
  const details = validateDays(template.days, { requireOne: true });
  const tasks = tasksForTemplate(template._id);
  if (tasks.length === 0) details.push(fieldError('tasks', 'Add at least one task before publishing.'));
  if (details.length > 0) throw validationFailure(details, 'Fix these issues before publishing.');

  const now = nowIso();
  const siblings = templatesFor(template).filter((candidate) => candidate._id !== template._id);
  const version = Math.max(
    maxVersion(siblings.filter((candidate) => candidate.status !== SCHEDULE_STATUS.DRAFT)) + 1,
    Number(template.version) || 1,
  );
  siblings.forEach((candidate) => {
    if (candidate.status === SCHEDULE_STATUS.PUBLISHED) {
      candidate.status = SCHEDULE_STATUS.ARCHIVED;
      candidate.updatedAt = now;
    }
  });
  const before = templateAuditSnapshot(template);
  template.version = version;
  template.status = SCHEDULE_STATUS.PUBLISHED;
  template.publishedAt = now;
  template.updatedAt = now;
  tasks.forEach((task) => {
    task.templateVersion = version;
  });
  addAudit({
    actorId: admin?._id,
    action: 'SCHEDULE_PUBLISHED',
    entityType: 'ScheduleTemplate',
    entityId: template._id,
    before,
    after: templateAuditSnapshot(template),
  });
  return template;
}

/** MM9/MM10: new DRAFT copied from a version, tasks included (prerequisites re-mapped). */
export function cloneScheduleTemplate({ admin, template }) {
  if (!template) throw notFoundError('Schedule');
  const versions = templatesFor(template);
  const draft = versions.find((candidate) => candidate.status === SCHEDULE_STATUS.DRAFT);
  if (draft) {
    throw httpError(
      409,
      'DRAFT_EXISTS',
      `Version ${draft.version} of this schedule is already a draft. Open it to keep editing.`,
    );
  }
  const now = nowIso();
  const copy = {
    _id: oid(),
    designationId: template.designationId,
    domainId: template.domainId,
    durationMonths: template.durationMonths,
    version: maxVersion(versions) + 1,
    status: SCHEDULE_STATUS.DRAFT,
    days: (template.days || []).map((day) => ({ ...day })),
    createdBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  };
  db.scheduleTemplates.push(copy);

  const sourceTasks = tasksForTemplate(template._id);
  const idMap = new Map(sourceTasks.map((task) => [task._id, oid()]));
  sourceTasks.forEach((task) => {
    db.taskDefinitions.push({
      ...snapshot(task),
      _id: idMap.get(task._id),
      templateId: copy._id,
      templateVersion: copy.version,
      prerequisiteTaskIds: (task.prerequisiteTaskIds || [])
        .map((id) => idMap.get(id))
        .filter(Boolean),
      createdBy: admin?._id ?? task.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    });
  });
  addAudit({
    actorId: admin?._id,
    action: 'SCHEDULE_CLONED',
    entityType: 'ScheduleTemplate',
    entityId: copy._id,
    before: { sourceTemplateId: template._id, sourceVersion: template.version },
    after: templateAuditSnapshot(copy),
  });
  return copy;
}

function taskAuditSnapshot(task) {
  return {
    templateId: task.templateId,
    sequence: task.sequence,
    dayNumber: task.dayNumber ?? null,
    title: task.title,
    prerequisiteTaskIds: [...(task.prerequisiteTaskIds || [])],
    requiresTrainerReview: task.requiresTrainerReview !== false,
    estimatedHours: task.estimatedHours ?? null,
  };
}

/** Merges the request body over the existing task (fields that are not sent stay unchanged). */
function normalizeTaskInput(input = {}, existing = {}) {
  const pick = (key) => (input[key] !== undefined ? input[key] : existing[key]);
  return {
    title: String(pick('title') ?? '').trim(),
    problemStatement: String(pick('problemStatement') ?? '').trim(),
    expectedOutcome: String(pick('expectedOutcome') ?? '').trim(),
    acceptanceCriteria: (Array.isArray(pick('acceptanceCriteria')) ? pick('acceptanceCriteria') : [])
      .map((criterion) => String(criterion ?? '').trim())
      .filter(Boolean),
    starterRepoUrl: String(pick('starterRepoUrl') ?? '').trim(),
    prerequisiteTaskIds: uniqueStrings(pick('prerequisiteTaskIds')),
    requiresTrainerReview:
      pick('requiresTrainerReview') === undefined ? true : Boolean(pick('requiresTrainerReview')),
    estimatedHours: toNumberOrNull(pick('estimatedHours')),
    sequence: toNumberOrNull(pick('sequence')),
    dayNumber: toNumberOrNull(pick('dayNumber')),
  };
}

function validateTaskFields(fields, { template, taskId = null }) {
  const details = [];
  if (fields.title.length < 3) {
    details.push(fieldError('title', 'Give the task a title (at least 3 characters).'));
  }
  if (!fields.problemStatement) {
    details.push(fieldError('problemStatement', 'Describe the problem the student will solve.'));
  }
  if (fields.acceptanceCriteria.length === 0) {
    details.push(fieldError('acceptanceCriteria', 'Add at least one acceptance criterion.'));
  }
  if (fields.starterRepoUrl && !/^https:\/\/\S+$/i.test(fields.starterRepoUrl)) {
    details.push(fieldError('starterRepoUrl', 'Use a full https:// link.'));
  }
  if (
    fields.estimatedHours !== null &&
    !(fields.estimatedHours > 0 && fields.estimatedHours <= MAX_TASK_HOURS)
  ) {
    details.push(fieldError('estimatedHours', `Estimated hours must be between 0 and ${MAX_TASK_HOURS}.`));
  }
  if (fields.sequence !== null && !(Number.isInteger(fields.sequence) && fields.sequence >= 1)) {
    details.push(fieldError('sequence', 'The sequence must be a whole number from 1.'));
  }
  const dayCount = Array.isArray(template.days) ? template.days.length : 0;
  if (
    fields.dayNumber !== null &&
    !(Number.isInteger(fields.dayNumber) && fields.dayNumber >= 1 && (dayCount === 0 || fields.dayNumber <= dayCount))
  ) {
    details.push(fieldError('dayNumber', `Choose a day from 1 to ${Math.max(dayCount, 1)}.`));
  }
  const siblingIds = new Set(tasksForTemplate(template._id).map((task) => task._id));
  if (taskId && fields.prerequisiteTaskIds.includes(taskId)) {
    details.push(fieldError('prerequisiteTaskIds', "A task can't be its own prerequisite."));
  } else if (fields.prerequisiteTaskIds.some((id) => !siblingIds.has(id))) {
    details.push(
      fieldError('prerequisiteTaskIds', 'Prerequisites must be tasks of the same schedule version.'),
    );
  }
  return details;
}

/** MM10: true when `taskId` would (indirectly) depend on itself with these prerequisites. */
function createsPrerequisiteLoop(templateId, taskId, prerequisiteIds) {
  const graph = new Map(
    tasksForTemplate(templateId).map((task) => [task._id, task.prerequisiteTaskIds || []]),
  );
  graph.set(taskId, prerequisiteIds);
  const stack = [...prerequisiteIds];
  const seen = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === taskId) return true;
    if (!seen.has(current)) {
      seen.add(current);
      (graph.get(current) || []).forEach((next) => stack.push(next));
    }
  }
  return false;
}

/** Renumbers a template's tasks 1..n, placing `movedId` (if any) at `position`. */
function resequenceTasks(templateId, movedId = null, position = 0) {
  const ordered = tasksForTemplate(templateId).filter((task) => task._id !== movedId);
  const moved = movedId ? findTaskDefinition(movedId) : null;
  if (moved) ordered.splice(Math.min(Math.max(position - 1, 0), ordered.length), 0, moved);
  ordered.forEach((task, index) => {
    task.sequence = index + 1;
  });
}

/** MM10: adds a task to a DRAFT template (409 TEMPLATE_PUBLISHED otherwise). */
export function createTaskDefinition({ admin, input = {} }) {
  const template = findTemplate(input.templateId);
  if (!template) throw notFoundError('Schedule');
  assertTemplateEditable(template);
  const fields = normalizeTaskInput(input);
  const details = validateTaskFields(fields, { template });
  if (details.length > 0) throw validationFailure(details);

  const now = nowIso();
  const count = tasksForTemplate(template._id).length + 1;
  const position = fields.sequence === null ? count : Math.min(fields.sequence, count);
  const dayCount = Array.isArray(template.days) ? template.days.length : 0;
  const task = {
    _id: oid(),
    templateId: template._id,
    templateVersion: template.version,
    sequence: position,
    dayNumber: fields.dayNumber ?? (dayCount > 0 ? Math.min(position, dayCount) : null),
    title: fields.title,
    problemStatement: fields.problemStatement,
    expectedOutcome: fields.expectedOutcome,
    acceptanceCriteria: fields.acceptanceCriteria,
    starterRepoUrl: fields.starterRepoUrl || null,
    prerequisiteTaskIds: fields.prerequisiteTaskIds,
    requiresTrainerReview: fields.requiresTrainerReview,
    estimatedHours: fields.estimatedHours,
    createdBy: admin?._id ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.taskDefinitions.push(task);
  resequenceTasks(template._id, task._id, position);
  addAudit({
    actorId: admin?._id,
    action: 'TASK_CREATED',
    entityType: 'TaskDefinition',
    entityId: task._id,
    after: taskAuditSnapshot(task),
  });
  return task;
}

/** MM10: edits a task of a DRAFT template; circular prerequisites are 422 CIRCULAR_PREREQUISITE. */
export function updateTaskDefinition({ admin, task, input = {} }) {
  if (!task) throw notFoundError('Task');
  const template = findTemplate(task.templateId);
  if (!template) throw notFoundError('Schedule');
  assertTemplateEditable(template);
  if (input.templateId && input.templateId !== task.templateId) {
    throw validationFailure([fieldError('templateId', "A task can't be moved to another schedule.")]);
  }
  const fields = normalizeTaskInput(input, task);
  const details = validateTaskFields(fields, { template, taskId: task._id });
  if (details.length > 0) throw validationFailure(details);
  if (createsPrerequisiteLoop(template._id, task._id, fields.prerequisiteTaskIds)) {
    throw httpError(
      422,
      'CIRCULAR_PREREQUISITE',
      'These prerequisites would create a loop: the task would end up depending on itself.',
      [fieldError('prerequisiteTaskIds', 'Remove the prerequisite that depends on this task.')],
    );
  }

  const before = taskAuditSnapshot(task);
  Object.assign(task, {
    title: fields.title,
    problemStatement: fields.problemStatement,
    expectedOutcome: fields.expectedOutcome,
    acceptanceCriteria: fields.acceptanceCriteria,
    starterRepoUrl: fields.starterRepoUrl || null,
    prerequisiteTaskIds: fields.prerequisiteTaskIds,
    requiresTrainerReview: fields.requiresTrainerReview,
    estimatedHours: fields.estimatedHours,
    dayNumber: fields.dayNumber ?? task.dayNumber ?? null,
    updatedAt: nowIso(),
  });
  if (fields.sequence !== null && fields.sequence !== Number(task.sequence)) {
    resequenceTasks(template._id, task._id, fields.sequence);
  }
  addAudit({
    actorId: admin?._id,
    action: 'TASK_UPDATED',
    entityType: 'TaskDefinition',
    entityId: task._id,
    before,
    after: taskAuditSnapshot(task),
  });
  return task;
}

/** MM10: removes a task from a DRAFT template and from the other tasks' prerequisites. */
export function deleteTaskDefinition({ admin, task }) {
  if (!task) throw notFoundError('Task');
  const template = findTemplate(task.templateId);
  if (template) assertTemplateEditable(template);
  const index = db.taskDefinitions.findIndex((candidate) => candidate._id === task._id);
  if (index >= 0) db.taskDefinitions.splice(index, 1);
  const now = nowIso();
  db.taskDefinitions.forEach((candidate) => {
    if (
      candidate.templateId === task.templateId &&
      Array.isArray(candidate.prerequisiteTaskIds) &&
      candidate.prerequisiteTaskIds.includes(task._id)
    ) {
      candidate.prerequisiteTaskIds = candidate.prerequisiteTaskIds.filter((id) => id !== task._id);
      candidate.updatedAt = now;
    }
  });
  resequenceTasks(task.templateId);
  addAudit({
    actorId: admin?._id,
    action: 'TASK_DELETED',
    entityType: 'TaskDefinition',
    entityId: task._id,
    before: taskAuditSnapshot(task),
  });
  return task;
}

/** PATCH /admin/schedules/:id/tasks/reorder: orderedIds must list every task exactly once. */
export function reorderTaskDefinitions({ admin, template, orderedIds }) {
  if (!template) throw notFoundError('Schedule');
  assertTemplateEditable(template);
  const tasks = tasksForTemplate(template._id);
  const ids = Array.isArray(orderedIds) ? orderedIds.map(String) : [];
  const valid =
    ids.length === tasks.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => tasks.some((task) => task._id === id));
  if (!valid) {
    throw validationFailure([fieldError('orderedIds', 'Send every task of this schedule exactly once.')]);
  }
  const before = { orderedIds: tasks.map((task) => task._id) };
  const now = nowIso();
  ids.forEach((id, index) => {
    const task = tasks.find((candidate) => candidate._id === id);
    task.sequence = index + 1;
    task.updatedAt = now;
  });
  addAudit({
    actorId: admin?._id,
    action: 'TASKS_REORDERED',
    entityType: 'ScheduleTemplate',
    entityId: template._id,
    before,
    after: { orderedIds: ids },
  });
  return tasksForTemplate(template._id);
}

// ===========================================================================
// Admin monitoring DTOs and stats (MM16, MM18, SD15)
// ===========================================================================

/** GET /admin/enrollments row: Enrollment & { student: { _id, name, email } } */
export function adminEnrollmentDto(enrollment) {
  if (!enrollment) return null;
  return { ...enrollmentDto(enrollment), student: userRef(enrollment.userId) };
}

/** GET /admin/payments row: { _id, orderId, provider, amount, currency, status, gatewayReference, flagged, flagReason, createdAt, user, enrollment: { _id, status, plan } } */
export function paymentDto(payment) {
  if (!payment) return null;
  const enrollment = findEnrollment(payment.enrollmentId);
  return {
    _id: payment._id,
    orderId: payment.orderId,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency || CURRENCY,
    status: payment.status,
    gatewayReference: payment.gatewayReference ?? null,
    flagged: Boolean(payment.flagged),
    flagReason: payment.flagReason ?? null,
    createdAt: payment.createdAt ?? null,
    user: userRef(payment.userId),
    enrollment: enrollment
      ? { _id: enrollment._id, status: enrollment.status, plan: planRef(enrollment.planId) }
      : null,
  };
}

/** Payment event { _id, eventId, type, processedAt, note } */
export function paymentEventDto(event) {
  if (!event) return null;
  return {
    _id: event._id,
    eventId: event.eventId,
    type: event.type,
    processedAt: event.processedAt ?? null,
    note: event.payload?.note ?? PAYMENT_EVENT_NOTES[event.type] ?? null,
  };
}

/** GET /admin/payments/:id body: payment row + events (oldest first). */
export function adminPaymentDetailDto(payment) {
  if (!payment) return null;
  return { ...paymentDto(payment), events: paymentEventsFor(payment._id).map(paymentEventDto) };
}

/** GET /admin/enrollments/:id body: enrollment + student + payments (with events) + trainer. */
export function adminEnrollmentDetailDto(enrollment) {
  if (!enrollment) return null;
  const assignment = activeAssignmentFor({ enrollmentId: enrollment._id, teamId: enrollment.teamId });
  return {
    ...adminEnrollmentDto(enrollment),
    payments: sortByTime(paymentsForEnrollment(enrollment._id), 'createdAt', 'desc').map(
      adminPaymentDetailDto,
    ),
    trainer: assignment ? userRef(assignment.trainerId) : null,
  };
}

/** Audit row { _id, actor: { _id, name, email } | null, action, entityType, entityId, before, after, ip, createdAt } */
export function auditDto(log) {
  if (!log) return null;
  return {
    _id: log._id,
    actor: userRef(log.actorId),
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? null,
    before: log.before ?? null,
    after: log.after ?? null,
    ip: log.ip ?? null,
    createdAt: log.createdAt ?? null,
  };
}

/** Schedule list row: { _id, designationId, designation, domainId, domain, durationMonths, version, status, daysCount, tasksCount, updatedAt, publishedAt } */
export function scheduleTemplateSummaryDto(template) {
  if (!template) return null;
  return {
    _id: template._id,
    designationId: template.designationId,
    designation: designationRef(template.designationId),
    domainId: template.domainId,
    domain: domainRef(template.domainId),
    durationMonths: template.durationMonths,
    version: template.version,
    status: template.status,
    daysCount: Array.isArray(template.days) ? template.days.length : 0,
    tasksCount: db.taskDefinitions.filter((task) => task.templateId === template._id).length,
    updatedAt: template.updatedAt ?? template.createdAt ?? null,
    publishedAt: template.publishedAt ?? null,
  };
}

/** Schedule detail: summary + days [{ dayNumber, title, activity, sopContent, requiredEvidence }] */
export function scheduleTemplateDto(template) {
  if (!template) return null;
  return {
    ...scheduleTemplateSummaryDto(template),
    days: sortedDays(template).map((day) => ({
      dayNumber: Number(day.dayNumber),
      title: day.title ?? '',
      activity: day.activity ?? '',
      sopContent: day.sopContent ?? '',
      requiredEvidence: day.requiredEvidence ?? '',
    })),
  };
}

/** Task definition (admin shape). */
export function taskDefinitionDto(task) {
  if (!task) return null;
  return {
    _id: task._id,
    templateId: task.templateId,
    templateVersion: task.templateVersion ?? null,
    sequence: Number(task.sequence) || 0,
    dayNumber: task.dayNumber ?? null,
    title: task.title ?? '',
    problemStatement: task.problemStatement ?? '',
    expectedOutcome: task.expectedOutcome ?? '',
    acceptanceCriteria: Array.isArray(task.acceptanceCriteria) ? [...task.acceptanceCriteria] : [],
    starterRepoUrl: task.starterRepoUrl ?? null,
    prerequisiteTaskIds: Array.isArray(task.prerequisiteTaskIds) ? [...task.prerequisiteTaskIds] : [],
    requiresTrainerReview: task.requiresTrainerReview !== false,
    estimatedHours: task.estimatedHours ?? null,
    createdAt: task.createdAt ?? null,
    updatedAt: task.updatedAt ?? null,
  };
}

function monthKey(value) {
  const time = toTime(value);
  if (!time) return null;
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The last `count` months (UTC) as YYYY-MM keys, oldest first. */
function recentMonthKeys(now, count) {
  const keys = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

/** GET /admin/stats body (see the contract). Revenue = SUCCESS payments, in paise. */
export function computeAdminStats(now = new Date()) {
  const countWhere = (items, predicate) => items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
  const sumAmount = (payments) => payments.reduce((total, payment) => total + (Number(payment.amount) || 0), 0);
  const paidAt = (payment) => payment.updatedAt || payment.createdAt;

  const { users, enrollments, payments, certificates } = db;
  const successful = payments.filter((payment) => payment.status === PAYMENT_STATUS.SUCCESS);
  const cutoff = now.getTime() - 30 * DAY_MS;

  const byDesignation = new Map();
  enrollments.forEach((enrollment) => {
    if (enrollment.status === ENROLLMENT_STATUS.CANCELLED) return;
    const plan = findPlan(enrollment.planId);
    const name = (plan && findDesignation(plan.designationId)?.name) || 'Unknown';
    byDesignation.set(name, (byDesignation.get(name) || 0) + 1);
  });

  return {
    users: {
      total: users.length,
      students: countWhere(users, (user) => userHasRole(user, ROLES.STUDENT)),
      trainers: countWhere(users, (user) => userHasRole(user, ROLES.TRAINER)),
      admins: countWhere(users, (user) => userHasRole(user, ROLES.ADMIN)),
      suspended: countWhere(users, (user) => user.status === USER_STATUS.SUSPENDED),
    },
    enrollments: {
      total: enrollments.length,
      pendingPayment: countWhere(enrollments, (e) => e.status === ENROLLMENT_STATUS.PENDING_PAYMENT),
      active: countWhere(enrollments, (e) => e.status === ENROLLMENT_STATUS.ACTIVE),
      inProgress: countWhere(enrollments, (e) => e.status === ENROLLMENT_STATUS.IN_PROGRESS),
      completed: countWhere(enrollments, (e) => e.status === ENROLLMENT_STATUS.COMPLETED),
      cancelled: countWhere(enrollments, (e) => e.status === ENROLLMENT_STATUS.CANCELLED),
    },
    revenue: {
      total: sumAmount(successful),
      last30Days: sumAmount(successful.filter((payment) => toTime(paidAt(payment)) >= cutoff)),
      currency: CURRENCY,
    },
    payments: {
      success: successful.length,
      failed: countWhere(payments, (payment) => payment.status === PAYMENT_STATUS.FAILED),
      pending: countWhere(payments, (payment) => payment.status === PAYMENT_STATUS.PENDING),
      flagged: countWhere(payments, (payment) => Boolean(payment.flagged)),
    },
    certificates: {
      issued: countWhere(certificates, (c) => c.status === CERTIFICATE_STATUS.ISSUED),
      revoked: countWhere(certificates, (c) => c.status === CERTIFICATE_STATUS.REVOKED),
      emailFailed: countWhere(certificates, (c) => c.emailStatus === EMAIL_STATUS.FAILED),
    },
    submissions: {
      pending: countWhere(db.taskSubmissions, (s) => s.reviewStatus === REVIEW_STATUS.PENDING),
    },
    revenueByMonth: recentMonthKeys(now, 6).map((month) => ({
      month,
      amount: sumAmount(successful.filter((payment) => monthKey(paidAt(payment)) === month)),
    })),
    enrollmentsByDesignation: [...byDesignation.entries()]
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => b.count - a.count || a.designation.localeCompare(b.designation)),
  };
}

// ===========================================================================
// Auth tokens (SD3), GitHub status (SD9), email queue (SD2) and audit log (MM18)
// ===========================================================================

/**
 * SD3: issues a one-time token (EMAIL_VERIFY: 24 h, PASSWORD_RESET: 1 h) and queues the email
 * with its link (/verify-email?token=... or /reset-password?token=...). Returns the token doc.
 */
export function issueAuthToken({ user, type }) {
  if (!user) throw notFoundError('User');
  const ttlHours = AUTH_TOKEN_TTL_HOURS[type];
  if (!ttlHours) throw new Error(`Unknown auth token type: ${type}`);
  const isVerify = type === AUTH_TOKEN_TYPE.EMAIL_VERIFY;
  const record = {
    _id: oid(),
    userId: user._id,
    type,
    token: makeToken(isVerify ? 'verify' : 'reset'),
    expiresAt: addHours(nowIso(), ttlHours),
    usedAt: null,
  };
  db.authTokens.push(record);
  queueEmail({
    to: user.email,
    template: isVerify ? EMAIL_TEMPLATES.VERIFY_EMAIL : EMAIL_TEMPLATES.RESET_PASSWORD,
    subject: isVerify ? 'Verify your email address' : 'Reset your password',
    link: buildPath(isVerify ? ROUTES.VERIFY_EMAIL : ROUTES.RESET_PASSWORD, {}, { token: record.token }),
    payload: { name: user.name, expiresAt: record.expiresAt },
  });
  return record;
}

/** SD3: 400 TOKEN_INVALID (unknown or already used) / 400 TOKEN_EXPIRED. Does not consume it. */
function checkAuthToken(token, type) {
  const key = String(token ?? '').trim();
  const record = key ? db.authTokens.find((candidate) => candidate.token === key && candidate.type === type) : null;
  if (!record) throw httpError(400, 'TOKEN_INVALID', 'This link is not valid. Request a new one.');
  if (record.usedAt) throw httpError(400, 'TOKEN_INVALID', 'This link has already been used.');
  if (isExpired(record.expiresAt)) {
    throw httpError(400, 'TOKEN_EXPIRED', 'This link has expired. Request a new one.');
  }
  const user = findUser(record.userId);
  if (!user) throw httpError(400, 'TOKEN_INVALID', 'This link is not valid. Request a new one.');
  return { record, user };
}

/** MM2: at least 8 characters with a letter and a number. Returns details[]. */
export function validatePassword(password, field = 'password') {
  const value = String(password ?? '');
  if (value.length < PASSWORD_MIN_LENGTH || !/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return [
      fieldError(field, `Use at least ${PASSWORD_MIN_LENGTH} characters with a letter and a number.`),
    ];
  }
  return [];
}

/** SD3: verification link works once; sets emailVerified and PENDING_VERIFICATION -> ACTIVE. */
export function verifyEmailWithToken(token) {
  const { record, user } = checkAuthToken(token, AUTH_TOKEN_TYPE.EMAIL_VERIFY);
  const now = nowIso();
  record.usedAt = now;
  user.emailVerified = true;
  if (user.status === USER_STATUS.PENDING_VERIFICATION) user.status = USER_STATUS.ACTIVE;
  user.updatedAt = now;
  return user;
}

/**
 * SD3: sets a new password with a reset token; the token (and any other unused reset token of
 * the user) is used up. The handler should also clear the refresh session.
 */
export function resetPasswordWithToken({ token, password }) {
  const { record, user } = checkAuthToken(token, AUTH_TOKEN_TYPE.PASSWORD_RESET);
  const details = validatePassword(password);
  if (details.length > 0) throw validationFailure(details);
  const now = nowIso();
  record.usedAt = now;
  db.authTokens.forEach((candidate) => {
    if (candidate.userId === user._id && candidate.type === AUTH_TOKEN_TYPE.PASSWORD_RESET && !candidate.usedAt) {
      candidate.usedAt = now;
    }
  });
  user.password = String(password);
  user.updatedAt = now;
  return user;
}

/** GET /github/connection: { connected, githubUsername, scopes[], connectedAt } (never a token). */
export function githubConnectionDto(connection) {
  if (!connection) return { connected: false, githubUsername: null, scopes: [], connectedAt: null };
  return {
    connected: true,
    githubUsername: connection.githubUsername ?? null,
    scopes: Array.isArray(connection.scopes) ? [...connection.scopes] : [],
    connectedAt: connection.connectedAt ?? null,
  };
}

/** SD2 (mock): the email "worker" delivers immediately: status SENT, attempts 1. Returns the job. */
export function queueEmail({ to, template, subject = '', link = null, payload = {} }) {
  const now = nowIso();
  const job = {
    _id: oid(),
    to: normalizeEmail(to),
    template,
    subject,
    link: link ?? null,
    payload: payload ?? {},
    status: EMAIL_STATUS.SENT,
    attempts: 1,
    createdAt: now,
    sentAt: now,
  };
  db.emailJobs.push(job);
  return job;
}

/** MM18: append-only audit entry (before/after are deep-copied). Returns the log. */
export function addAudit({
  actorId = null,
  action,
  entityType,
  entityId = null,
  before = null,
  after = null,
  ip = DEFAULT_IP,
}) {
  const log = {
    _id: oid(),
    actorId: actorId ?? null,
    action,
    entityType,
    entityId: entityId ?? null,
    before: snapshot(before),
    after: snapshot(after),
    ip,
    createdAt: nowIso(),
  };
  db.auditLogs.push(log);
  return log;
}
