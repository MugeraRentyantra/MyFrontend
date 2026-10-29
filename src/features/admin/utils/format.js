import {
  CheckCircle2,
  Clock,
  Flag,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Undo2,
  XCircle,
} from '@/shared/icons';
import { ROUTES, buildPath } from '@/shared/constants';
import { formatDuration, humanize } from '@/shared/utils/helpers';

/**
 * Display helpers for the admin console. Plain JavaScript (no JSX). Money is only formatted, never computed.
 */

// ---------------------------------------------------------------------------
// People and plans
// ---------------------------------------------------------------------------

export function personName(person, fallback = 'Unknown user') {
  return person?.name || person?.email || fallback;
}

/** "Java Developer" */
export function planTitle(plan) {
  return plan?.designation?.name || 'Unknown designation';
}

/** "Banking · 3 months" */
export function planMeta(plan) {
  return [plan?.domain?.name, plan?.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');
}

/** "Java Developer · Banking · 3 months" */
export function planLabel(plan) {
  return [planTitle(plan), planMeta(plan)].filter(Boolean).join(' · ');
}

/** The designation of a stats row may be a plain name or a DesignationRef. */
export function designationName(designation) {
  if (typeof designation === 'string') return designation;
  return designation?.name || 'Unknown designation';
}

// ---------------------------------------------------------------------------
// Months ("YYYY-MM" from the stats endpoint)
// ---------------------------------------------------------------------------

const MONTH_SHORT = new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' });
const MONTH_LONG = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function parseMonth(value) {
  const match = /^(\d{4})-(\d{1,2})/.exec(String(value ?? ''));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Oct" or "Oct ’26" (axis label). Unparseable values are returned as they are. */
export function formatMonthShort(value, withYear = false) {
  const date = parseMonth(value);
  if (!date) return String(value ?? '');
  const month = MONTH_SHORT.format(date);
  return withYear ? `${month} ’${String(date.getUTCFullYear()).slice(-2)}` : month;
}

/** "October 2026" (screen-reader summaries). */
export function formatMonthLong(value) {
  const date = parseMonth(value);
  return date ? MONTH_LONG.format(date) : String(value ?? '');
}

export function monthYear(value) {
  return parseMonth(value)?.getUTCFullYear() ?? null;
}

// ---------------------------------------------------------------------------
// Payment gateway events (KD8 timeline)
// ---------------------------------------------------------------------------

const PAYMENT_EVENT_META = {
  'order.created': { title: 'Order created', icon: Receipt, variant: 'neutral' },
  'payment.pending': { title: 'Payment pending', icon: Clock, variant: 'warning' },
  'payment.authorized': { title: 'Payment authorized', icon: ShieldCheck, variant: 'brand' },
  'payment.captured': { title: 'Payment captured', icon: CheckCircle2, variant: 'success' },
  'payment.succeeded': { title: 'Payment succeeded', icon: CheckCircle2, variant: 'success' },
  'payment.failed': { title: 'Payment failed', icon: XCircle, variant: 'danger' },
  'payment.flagged': { title: 'Flagged for review', icon: Flag, variant: 'warning' },
  'refund.created': { title: 'Refund started', icon: RotateCcw, variant: 'warning' },
  'refund.initiated': { title: 'Refund started', icon: RotateCcw, variant: 'warning' },
  'refund.pending': { title: 'Refund pending', icon: RotateCcw, variant: 'warning' },
  'refund.processed': { title: 'Refund processed', icon: Undo2, variant: 'neutral' },
  'refund.completed': { title: 'Refund processed', icon: Undo2, variant: 'neutral' },
  'refund.failed': { title: 'Refund failed', icon: XCircle, variant: 'danger' },
};

/** { title, icon, variant } for a gateway event type such as "payment.captured". */
export function getPaymentEventMeta(type) {
  const key = String(type ?? '').toLowerCase();
  if (PAYMENT_EVENT_META[key]) return PAYMENT_EVENT_META[key];
  const title = humanize(key.replace(/\./g, ' ')) || 'Gateway event';
  if (key.includes('fail')) return { title, icon: XCircle, variant: 'danger' };
  if (key.startsWith('refund')) return { title, icon: RotateCcw, variant: 'warning' };
  if (key.includes('captur') || key.includes('success')) {
    return { title, icon: CheckCircle2, variant: 'success' };
  }
  return { title, icon: undefined, variant: 'neutral' };
}

/** Timeline items (oldest first) for a payment's events. */
export function toPaymentTimelineItems(events = []) {
  return [...(Array.isArray(events) ? events : [])]
    .sort((a, b) => new Date(a?.processedAt ?? 0).getTime() - new Date(b?.processedAt ?? 0).getTime())
    .map((event, index) => {
      const meta = getPaymentEventMeta(event?.type);
      return {
        id: event?._id ?? event?.eventId ?? index,
        title: meta.title,
        icon: meta.icon,
        variant: meta.variant,
        time: event?.processedAt,
        note: event?.note,
        eventId: event?.eventId,
      };
    });
}

// ---------------------------------------------------------------------------
// Deep links between admin lists (?payment= / ?enrollment= open the detail drawer)
// ---------------------------------------------------------------------------

export const adminLinks = Object.freeze({
  payment: (paymentId) => buildPath(ROUTES.ADMIN_PAYMENTS, {}, { payment: paymentId }),
  payments: (query) => buildPath(ROUTES.ADMIN_PAYMENTS, {}, query),
  enrollment: (enrollmentId) => buildPath(ROUTES.ADMIN_ENROLLMENTS, {}, { enrollment: enrollmentId }),
  enrollments: (query) => buildPath(ROUTES.ADMIN_ENROLLMENTS, {}, query),
  certificates: (query) => buildPath(ROUTES.ADMIN_CERTIFICATES, {}, query),
  users: (query) => buildPath(ROUTES.ADMIN_USERS, {}, query),
});

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export function auditActionLabel(action) {
  return humanize(action) || 'Unknown action';
}

export function entityTypeLabel(entityType) {
  return humanize(entityType) || 'Record';
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** JSON with sorted object keys, so equal values compare equal regardless of key order. */
function stableStringify(value) {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function asRecord(value) {
  if (value === null || value === undefined) return {};
  return isPlainObject(value) ? value : { value };
}

/**
 * Field-by-field comparison of an audit entry's before/after snapshots:
 * [{ key, before, after, hasBefore, hasAfter, change: 'added'|'removed'|'changed'|'same' }]
 */
export function buildAuditDiff(before, after) {
  const previous = asRecord(before);
  const next = asRecord(after);
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])];
  return keys.map((key) => {
    const hasBefore = previous[key] !== undefined;
    const hasAfter = next[key] !== undefined;
    let change = 'same';
    if (!hasBefore && hasAfter) change = 'added';
    else if (hasBefore && !hasAfter) change = 'removed';
    else if (stableStringify(previous[key]) !== stableStringify(next[key])) change = 'changed';
    return { key, before: previous[key], after: next[key], hasBefore, hasAfter, change };
  });
}

/** Names of the fields that differ, for the audit table's "Changes" column. */
export function changedAuditKeys(before, after) {
  return buildAuditDiff(before, after)
    .filter((row) => row.change !== 'same')
    .map((row) => row.key);
}
