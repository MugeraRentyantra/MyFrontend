import {
  CERTIFICATE_STATUS,
  EMAIL_STATUS,
  ENROLLMENT_STATUS,
  PAYMENT_STATUS,
  ROLE_LABELS,
  ROLE_LIST,
  ROLES,
  USER_STATUS,
  getStatusMeta,
} from '@/shared/constants';
import { humanize } from '@/shared/utils/helpers';

/** Option lists for the admin filter selects (value = API enum, label = the StatusBadge label). */
const toStatusOption = (value) => ({ value, label: getStatusMeta(value).label });

export const ROLE_OPTIONS = ROLE_LIST.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
export const USER_STATUS_OPTIONS = Object.values(USER_STATUS).map(toStatusOption);
export const ENROLLMENT_STATUS_OPTIONS = Object.values(ENROLLMENT_STATUS).map(toStatusOption);
export const PAYMENT_STATUS_OPTIONS = Object.values(PAYMENT_STATUS).map(toStatusOption);
export const CERTIFICATE_STATUS_OPTIONS = Object.values(CERTIFICATE_STATUS).map(toStatusOption);
export const EMAIL_STATUS_TABS = [
  { value: '', label: 'All' },
  ...Object.values(EMAIL_STATUS).map(toStatusOption).sort((a, b) => {
    const order = [EMAIL_STATUS.SENT, EMAIL_STATUS.PENDING, EMAIL_STATUS.FAILED];
    return order.indexOf(a.value) - order.indexOf(b.value);
  }),
];

/** Role pills: roles are not statuses, so they use neutral/brand-family tints. */
export const ROLE_BADGE_VARIANT = Object.freeze({
  [ROLES.ADMIN]: 'purple',
  [ROLES.TRAINER]: 'info',
  [ROLES.STUDENT]: 'neutral',
});

export const ROLE_DESCRIPTIONS = Object.freeze({
  [ROLES.STUDENT]: 'Takes assessments, enrolls in internships and submits tasks.',
  [ROLES.TRAINER]: 'Reviews submissions from the students and teams assigned to them.',
  [ROLES.ADMIN]: 'Full access to the catalog, people, payments and certificates.',
});

/**
 * Audit actions the API writes (MM16, MM18, SD15 and the catalog/schedule/assignment admin screens).
 * The table renders any other action too (humanised); this list only feeds the action filter.
 */
export const AUDIT_ACTIONS = Object.freeze([
  'USER_ROLES_CHANGED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'DESIGNATION_CREATED',
  'DESIGNATION_UPDATED',
  'DESIGNATION_PUBLISHED',
  'DESIGNATION_UNPUBLISHED',
  'DOMAIN_CREATED',
  'DOMAIN_UPDATED',
  'DOMAIN_PUBLISHED',
  'DOMAIN_UNPUBLISHED',
  'PLAN_CREATED',
  'PRICE_UPDATED',
  'PLAN_PUBLISHED',
  'PLAN_UNPUBLISHED',
  'ASSESSMENT_UPDATED',
  'SLABS_UPDATED',
  'ASSESSMENT_PUBLISHED',
  'SCHEDULE_CREATED',
  'SCHEDULE_UPDATED',
  'SCHEDULE_PUBLISHED',
  'SCHEDULE_CLONED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASKS_REORDERED',
  'TRAINER_ASSIGNED',
  'TRAINER_UNASSIGNED',
  'CERTIFICATE_ISSUED',
  'CERTIFICATE_EMAIL_RESENT',
]);

export const AUDIT_ACTION_OPTIONS = AUDIT_ACTIONS.map((action) => ({
  value: action,
  label: humanize(action),
}));

/** Payments the dashboard asks an admin to verify, most urgent first. */
export const ATTENTION_REASONS = Object.freeze({
  FLAGGED: 'flagged',
  PENDING: 'pending',
  FAILED: 'failed',
});

/** Stats refresh while the dashboard is open (React Query pauses it in background tabs). */
export const DASHBOARD_REFRESH_MS = 60 * 1000;

/** Long lookup lists (designations, admins) fetched once for filter selects. */
export const OPTIONS_PAGE_LIMIT = 100;
export const OPTIONS_STALE_MS = 5 * 60 * 1000;
