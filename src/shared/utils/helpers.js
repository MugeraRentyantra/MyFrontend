/**
 * Formatting and small pure helpers. Money is always an integer number of paise from the
 * server; the UI only formats it and never calculates prices.
 */

const LOCALE = 'en-IN';

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** formatMoney(999900) -> "₹9,999" ; formatMoney(999950) -> "₹9,999.50" */
export function formatMoney(paise, currency = 'INR', { showDecimals = false } = {}) {
  if (paise === null || paise === undefined || Number.isNaN(Number(paise))) return '—';
  const amount = Number(paise) / 100;
  const hasFraction = Math.round(Math.abs(amount) * 100) % 100 !== 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: showDecimals || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Compact money for KPI tiles: 125000000 paise -> "₹12.5L" (Indian grouping). */
export function formatCompactMoney(paise, currency = 'INR') {
  if (paise === null || paise === undefined || Number.isNaN(Number(paise))) return '—';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(paise) / 100);
}

export function paiseToRupees(paise) {
  return Number(paise || 0) / 100;
}

/** Converts a rupee amount typed by an admin to integer paise. */
export function rupeesToPaise(rupees) {
  return Math.round(Number(rupees || 0) * 100);
}

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(LOCALE).format(Number(value));
}

/** 1284 -> "1.3K", 125000 -> "1.3L" */
export function formatCompactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 }).format(
    Number(value),
  );
}

export function formatPercent(value, fractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(fractionDigits)}%`;
}

/** Whole-number percentage of part/total, safe for total = 0. */
export function percent(part, total) {
  if (!total) return 0;
  return Math.round((Number(part) / Number(total)) * 100);
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

// ---------------------------------------------------------------------------
// Dates (API sends ISO-8601 UTC strings; we display in the viewer's local time)
// ---------------------------------------------------------------------------

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "27 Oct 2026" */
export function formatDate(value, options) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

/** "27 Oct 2026, 3:45 pm" */
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** "3 days ago", "in 2 hours", "yesterday" */
export function formatRelativeTime(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '—';
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSeconds / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSeconds / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSeconds / (86400 * 365)), 'year');
}

/** Short age label for queues: "45m", "5h", "3d". */
export function formatAge(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '—';
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function hoursSince(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return 0;
  return (now - date.getTime()) / 3600000;
}

export function isPast(value, now = Date.now()) {
  const date = toDate(value);
  return Boolean(date && date.getTime() < now);
}

/** formatDuration(1) -> "1 month", formatDuration(6) -> "6 months" */
export function formatDuration(months) {
  if (months === null || months === undefined) return '—';
  return `${months} ${Number(months) === 1 ? 'month' : 'months'}`;
}

/** ISO date (YYYY-MM-DD) for <input type="date"> values and API date filters. */
export function toISODate(value) {
  const date = toDate(value);
  if (!date) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${Number(count) === 1 ? singular : plural}`;
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

/** "PENDING_PAYMENT" -> "Pending payment" */
export function humanize(value) {
  if (value === null || value === undefined || value === '') return '';
  const text = String(value).replace(/[_-]+/g, ' ').toLowerCase().trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "a1b2c3...ff" -> "…C3FF" style short reference for ids. */
export function shortId(id = '') {
  return String(id).slice(-6).toUpperCase();
}

export function maskEmail(email = '') {
  const [user, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

// ---------------------------------------------------------------------------
// Validation helpers (client-side hints only; the server always re-validates)
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GITHUB_RE = /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})(?:\/[A-Za-z0-9._-]+)?(?:\/.*)?$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

/** Accepts repository, commit and pull-request URLs that start with https://github.com/ */
export function isGithubUrl(value) {
  return GITHUB_RE.test(String(value || '').trim());
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function groupBy(items = [], keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

export function sortBy(items = [], keyFn, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = keyFn(a);
    const bv = keyFn(b);
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? factor : -factor;
  });
}

export function uniqueBy(items = [], keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** Triggers a browser download for a (signed) URL. */
export function downloadFile(url, filename) {
  const anchor = document.createElement('a');
  anchor.href = url;
  if (filename) anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function absoluteUrl(path) {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

/** Removes undefined / null / '' values so they are not sent as query params. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}
