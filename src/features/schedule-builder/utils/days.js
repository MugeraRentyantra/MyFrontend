/**
 * Helpers for editing schedule days (KD6). The editor keeps a client-only `key` on every day so
 * React can track rows while they are reordered; it is stripped before anything is sent.
 */

let keyCounter = 0;

/** Unique, client-only key for list rows (days, acceptance criteria). */
export function createRowKey(prefix = 'row') {
  keyCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${keyCounter}`;
}

function text(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** A blank day as the API expects it (used when a schedule is created). */
export function emptyDayPayload(dayNumber = 1) {
  return { dayNumber, title: '', activity: '', sopContent: '', requiredEvidence: '' };
}

/** A blank editable day row (DynamicRowEditor `createRow`). */
export function createEmptyDay(index = 0) {
  return { key: createRowKey('day'), ...emptyDayPayload(index + 1) };
}

/**
 * Server days -> editable rows, numbered 1..n in their current order. Keys of `previous` rows are
 * reused by position so a refresh after saving doesn't remount every row.
 */
export function toEditableDays(days, previous = []) {
  const list = Array.isArray(days) ? [...days] : [];
  list.sort((a, b) => (Number(a?.dayNumber) || 0) - (Number(b?.dayNumber) || 0));
  return list.map((day, index) => ({
    key: previous[index]?.key ?? createRowKey('day'),
    dayNumber: index + 1,
    title: text(day?.title),
    activity: text(day?.activity),
    sopContent: text(day?.sopContent),
    requiredEvidence: text(day?.requiredEvidence),
  }));
}

/** Editable rows -> request body `days` (renumbered, trimmed, without client keys). */
export function toDaysPayload(days = []) {
  return days.map((day, index) => ({
    dayNumber: index + 1,
    title: text(day.title).trim(),
    activity: text(day.activity).trim(),
    sopContent: text(day.sopContent).replace(/\s+$/, ''),
    requiredEvidence: text(day.requiredEvidence).trim(),
  }));
}

/** Stable string used to detect unsaved changes. */
export function serializeDays(days = []) {
  return JSON.stringify(toDaysPayload(days));
}

/** Renumbers rows after add / remove / reorder (dayNumber = index + 1). */
export function renumberDays(days = []) {
  return days.map((day, index) => (day.dayNumber === index + 1 ? day : { ...day, dayNumber: index + 1 }));
}

/** DOM id of a day field, so the editor can focus the first invalid one. */
export function dayFieldId(dayKey, field) {
  return `schedule-day-${dayKey}-${field}`;
}
