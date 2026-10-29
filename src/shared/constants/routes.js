import { ROLES, getPrimaryRole } from './roles';

/** Every route pattern in the app. Build concrete URLs with `paths.*` or `buildPath`. */
export const ROUTES = Object.freeze({
  // Public
  HOME: '/',
  CATALOG: '/internships',
  DESIGNATION: '/internships/:slug',
  TERMS: '/terms',
  VERIFY_CERTIFICATE: '/verify',
  VERIFY_CERTIFICATE_NUMBER: '/verify/:number',
  TEAM_INVITE: '/team/invite/:token',
  UI_KIT: '/dev/ui',
  FORBIDDEN: '/403',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  CHECK_EMAIL: '/check-email',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Student
  DASHBOARD: '/dashboard',
  ASSESSMENT: '/assessment/:designationId',
  ASSESSMENT_RESULT: '/assessment/:designationId/result',
  ENROLL: '/enroll',
  PAYMENT: '/payment/:enrollmentId',
  PAYMENT_STATUS: '/payment/status',
  TEAM_NEW: '/team/new',
  TEAM: '/team/:id',
  SCHEDULE: '/schedule',
  SOP: '/schedule/:day/sop',
  TASKS: '/tasks',
  TASK: '/tasks/:id',
  CERTIFICATE: '/certificate',
  PROFILE: '/profile',
  GITHUB_CALLBACK: '/github/callback',

  // Trainer
  TRAINER: '/trainer',
  TRAINER_REVIEW: '/trainer/review/:submissionId',
  TRAINER_REPORTS: '/trainer/reports',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_DESIGNATIONS: '/admin/designations',
  ADMIN_DOMAINS: '/admin/domains',
  ADMIN_PLANS: '/admin/plans',
  ADMIN_ASSESSMENTS: '/admin/assessments',
  ADMIN_ASSESSMENT: '/admin/assessments/:designationId',
  ADMIN_SCHEDULES: '/admin/schedules',
  ADMIN_SCHEDULE: '/admin/schedules/:id',
  ADMIN_SCHEDULE_TASKS: '/admin/schedules/:id/tasks',
  ADMIN_TASKS: '/admin/tasks',
  ADMIN_ENROLLMENTS: '/admin/enrollments',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_ASSIGNMENTS: '/admin/assignments',
  ADMIN_CERTIFICATES: '/admin/certificates',
  ADMIN_AUDIT: '/admin/audit',
});

/**
 * Replaces `:params` in a route pattern and appends an optional query string.
 * buildPath(ROUTES.TASK, { id: 'abc' }) -> '/tasks/abc'
 */
export function buildPath(pattern, params = {}, query) {
  let path = pattern.replace(/:([A-Za-z0-9_]+)/g, (_match, key) => {
    const value = params[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`buildPath: missing param "${key}" for "${pattern}"`);
    }
    return encodeURIComponent(String(value));
  });
  if (query) {
    const entries = Object.entries(query).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    );
    if (entries.length > 0) {
      path += `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
    }
  }
  return path;
}

/** Typed helpers for every parameterised route. Prefer these over string concatenation. */
export const paths = Object.freeze({
  designation: (slug) => buildPath(ROUTES.DESIGNATION, { slug }),
  verifyCertificate: (number) => buildPath(ROUTES.VERIFY_CERTIFICATE_NUMBER, { number }),
  teamInvite: (token) => buildPath(ROUTES.TEAM_INVITE, { token }),
  assessment: (designationId) => buildPath(ROUTES.ASSESSMENT, { designationId }),
  assessmentResult: (designationId, query) =>
    buildPath(ROUTES.ASSESSMENT_RESULT, { designationId }, query),
  /** query: { designationId, planId, teamId } */
  enroll: (query) => buildPath(ROUTES.ENROLL, {}, query),
  payment: (enrollmentId) => buildPath(ROUTES.PAYMENT, { enrollmentId }),
  /** query: { enrollmentId, orderId } */
  paymentStatus: (query) => buildPath(ROUTES.PAYMENT_STATUS, {}, query),
  team: (id) => buildPath(ROUTES.TEAM, { id }),
  /** query: { planId, designationId } */
  teamNew: (query) => buildPath(ROUTES.TEAM_NEW, {}, query),
  sop: (day) => buildPath(ROUTES.SOP, { day }),
  task: (id, query) => buildPath(ROUTES.TASK, { id }, query),
  trainerReview: (submissionId) => buildPath(ROUTES.TRAINER_REVIEW, { submissionId }),
  adminAssessment: (designationId) => buildPath(ROUTES.ADMIN_ASSESSMENT, { designationId }),
  adminSchedule: (id) => buildPath(ROUTES.ADMIN_SCHEDULE, { id }),
  adminScheduleTasks: (id) => buildPath(ROUTES.ADMIN_SCHEDULE_TASKS, { id }),
  login: (redirectTo) => buildPath(ROUTES.LOGIN, {}, redirectTo ? { redirect: redirectTo } : undefined),
  register: (redirectTo) =>
    buildPath(ROUTES.REGISTER, {}, redirectTo ? { redirect: redirectTo } : undefined),
});

export const ROLE_HOME = Object.freeze({
  [ROLES.ADMIN]: ROUTES.ADMIN,
  [ROLES.TRAINER]: ROUTES.TRAINER,
  [ROLES.STUDENT]: ROUTES.DASHBOARD,
});

/** Where a user lands after login: admin -> /admin, trainer -> /trainer, student -> /dashboard. */
export function getHomeRoute(user) {
  if (!user) return ROUTES.LOGIN;
  return ROLE_HOME[getPrimaryRole(user)] ?? ROUTES.DASHBOARD;
}

/** Only allow same-app relative redirects (prevents open-redirects via ?redirect=). */
export function getSafeRedirect(target) {
  if (typeof target !== 'string') return null;
  if (!target.startsWith('/') || target.startsWith('//')) return null;
  return target;
}
