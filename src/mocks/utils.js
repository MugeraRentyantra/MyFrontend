import { delay, http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/shared/constants';
import { db, persist } from './db';

/**
 * Shared helpers for mock handlers. Handlers are written with `mock.get/post/...` (not
 * msw's `http.*` directly) so every handler gets: simulated latency, the failure-scenario
 * switch from the Mock Devtools (ticket GP1), crash safety and persistence of the mock DB.
 */

export const API = API_BASE_URL;
export const apiPath = (path) => `${API}${path}`;

// ---------------------------------------------------------------------------
// Settings (latency + forced scenario), persisted so they survive reloads
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'ip.mock.settings';
const DEFAULT_LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 350);

export const SCENARIOS = [
  { value: 'none', label: 'Normal responses' },
  { value: 'validation', label: '422 validation error on writes' },
  { value: 'unauthorized', label: '401 unauthorized' },
  { value: 'forbidden', label: '403 forbidden' },
  { value: 'not-found', label: '404 not found' },
  { value: 'empty', label: 'Empty lists' },
  { value: 'server-error', label: '500 server error' },
  { value: 'network-error', label: 'Network error' },
];

function readStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key);
    else globalThis.localStorage?.setItem(key, value);
  } catch {
    // storage unavailable: settings live for this page load only
  }
}

/** { latency: number(ms), scenario: SCENARIOS[].value, scenarioMatch: string (path substring) } */
export function getMockSettings() {
  const defaults = { latency: DEFAULT_LATENCY, scenario: 'none', scenarioMatch: '' };
  try {
    return { ...defaults, ...JSON.parse(readStorage(SETTINGS_KEY) || '{}') };
  } catch {
    return defaults;
  }
}

export function setMockSettings(patch) {
  const next = { ...getMockSettings(), ...patch };
  writeStorage(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export function json(data, status = 200, init = {}) {
  return HttpResponse.json(data, { status, ...init });
}

export const created = (data) => json(data, 201);

export function noContent() {
  return new HttpResponse(null, { status: 204 });
}

/** Standard error envelope: { success:false, error:{ code, message, details[] } } */
export function apiError(status, code, message, details = []) {
  return HttpResponse.json({ success: false, error: { code, message, details } }, { status });
}

export const badRequest = (code, message, details) => apiError(400, code, message, details);
export const unauthorized = (message = 'Please log in to continue.', code = 'UNAUTHENTICATED') =>
  apiError(401, code, message);
export const forbidden = (message = "You don't have permission to do this.", code = 'FORBIDDEN') =>
  apiError(403, code, message);
export const notFound = (what = 'Resource') => apiError(404, 'NOT_FOUND', `${what} not found.`);
export const conflict = (code, message, details) => apiError(409, code, message, details);
export const gone = (code, message) => apiError(410, code, message);
export const unprocessable = (code, message, details) => apiError(422, code, message, details);

/** 422 with field-level details: validationError([{ field: 'email', message: '...' }]) */
export function validationError(details, message = 'Please check the highlighted fields.') {
  return apiError(422, 'VALIDATION_ERROR', message, details);
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

export function getQuery(request) {
  return new URL(request.url).searchParams;
}

export function getPagination(request, defaultLimit = 10) {
  const query = getQuery(request);
  const page = Math.max(1, Number.parseInt(query.get('page') || '1', 10) || 1);
  const rawLimit = Number.parseInt(query.get('limit') || String(defaultLimit), 10) || defaultLimit;
  const limit = Math.min(200, Math.max(1, rawLimit));
  return { page, limit };
}

/** Slices an already filtered + sorted array into { items, page, limit, total }. */
export function paginate(items, request, defaultLimit = 10) {
  const { page, limit } = getPagination(request, defaultLimit);
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), page, limit, total: items.length };
}

/** Applies ?sort=field:asc|desc when present (falls back to the given default). */
export function applySort(items, request, fallback) {
  const sort = getQuery(request).get('sort');
  const [field, direction] = (sort || fallback || '').split(':');
  if (!field) return items;
  const factor = direction === 'asc' ? 1 : -1;
  const read = (item) => field.split('.').reduce((value, key) => value?.[key], item);
  return [...items].sort((a, b) => {
    const av = read(a);
    const bv = read(b);
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return av > bv ? factor : -factor;
  });
}

export async function readJson(request) {
  try {
    return (await request.json()) ?? {};
  } catch {
    return {};
  }
}

/** Case-insensitive "contains" across any number of fields. Empty search matches everything. */
export function matchesSearch(search, ...fields) {
  if (!search) return true;
  const needle = String(search).trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle));
}

/** from/to are YYYY-MM-DD (inclusive) or ISO strings. */
export function inDateRange(iso, from, to) {
  if (!iso) return !from && !to;
  const time = new Date(iso).getTime();
  if (from && time < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) end.setHours(23, 59, 59, 999);
    if (time > end.getTime()) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Auth (access token in the Authorization header; refresh "cookie" in localStorage)
// ---------------------------------------------------------------------------

export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_KEY = 'ip.mock.refreshSession';

export function issueAccessToken(userId) {
  return `mock.${userId}.${Date.now() + ACCESS_TOKEN_TTL_MS}`;
}

export function parseAccessToken(token) {
  const [prefix, userId, expiresAt] = String(token || '').split('.');
  if (prefix !== 'mock' || !userId) return null;
  return { userId, expired: Number(expiresAt) < Date.now() };
}

/** Simulates the httpOnly refresh-token cookie. */
export function setRefreshSession(userId) {
  writeStorage(REFRESH_KEY, userId);
}

export function getRefreshSession() {
  return readStorage(REFRESH_KEY);
}

export function clearRefreshSession() {
  writeStorage(REFRESH_KEY, null);
}

/** Returns { user } or { error: Response }. */
export function getAuthUser(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { error: unauthorized() };
  const parsed = parseAccessToken(token);
  if (!parsed) return { error: unauthorized('Your session is invalid. Please log in again.') };
  if (parsed.expired) return { error: unauthorized('Your session has expired.', 'TOKEN_EXPIRED') };
  const user = db.users.find((candidate) => candidate._id === parsed.userId);
  if (!user) return { error: unauthorized('Your session is invalid. Please log in again.') };
  if (user.status === 'SUSPENDED') {
    return { error: forbidden('This account has been suspended.', 'ACCOUNT_SUSPENDED') };
  }
  return { user };
}

/**
 * Usage inside a resolver:
 *   const auth = requireAuth(request, ['ADMIN']);
 *   if (auth.error) return auth.error;
 *   const { user } = auth;
 */
export function requireAuth(request, roles) {
  const result = getAuthUser(request);
  if (result.error) return result;
  if (roles && roles.length > 0 && !roles.some((role) => result.user.roles.includes(role))) {
    return { error: forbidden() };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Handler factory
// ---------------------------------------------------------------------------

function scenarioResponse(request, settings) {
  const { scenario, scenarioMatch } = settings;
  if (!scenario || scenario === 'none' || scenario === 'empty') return null;
  const { pathname } = new URL(request.url);
  if (scenarioMatch && !pathname.includes(scenarioMatch)) return null;
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  switch (scenario) {
    case 'validation':
      return isWrite
        ? validationError([
            { field: 'form', message: 'Simulated validation error from the mock server.' },
          ])
        : null;
    case 'unauthorized':
      return unauthorized('Simulated 401 from the mock server.');
    case 'forbidden':
      return forbidden('Simulated 403 from the mock server.');
    case 'not-found':
      return notFound('Simulated resource');
    case 'server-error':
      return apiError(500, 'INTERNAL_ERROR', 'Simulated 500 from the mock server.');
    case 'network-error':
      return HttpResponse.error();
    default:
      return null;
  }
}

async function emptyListResponse(request, response, settings) {
  if (settings.scenario !== 'empty' || request.method !== 'GET' || !response) return response;
  const { pathname } = new URL(request.url);
  if (settings.scenarioMatch && !pathname.includes(settings.scenarioMatch)) return response;
  try {
    const body = await response.clone().json();
    if (body && Array.isArray(body.items)) {
      return json({ ...body, items: [], total: 0 }, response.status);
    }
  } catch {
    // not JSON: leave untouched
  }
  return response;
}

function wrap(resolver) {
  return async (info) => {
    const settings = getMockSettings();
    if (settings.latency > 0) await delay(settings.latency);
    const forced = scenarioResponse(info.request, settings);
    if (forced) return forced;
    try {
      const response = await resolver(info);
      return await emptyListResponse(info.request, response, settings);
    } catch (error) {
      // Domain logic (mocks/services.js) throws MockHttpError-like objects for business rules.
      if (error && typeof error.status === 'number' && typeof error.code === 'string') {
        return apiError(error.status, error.code, error.message, error.details || []);
      }
      // eslint-disable-next-line no-console
      console.error('[mock api] handler crashed', info.request.method, info.request.url, error);
      return apiError(500, 'MOCK_HANDLER_ERROR', error?.message || 'Mock handler crashed.');
    } finally {
      persist();
    }
  };
}

/**
 * Mock route builders. `path` is relative to the API base, e.g. mock.get('/designations', fn).
 * Register static paths (e.g. '/teams/mine') BEFORE parameterised ones ('/teams/:id').
 */
export const mock = {
  get: (path, resolver) => http.get(apiPath(path), wrap(resolver)),
  post: (path, resolver) => http.post(apiPath(path), wrap(resolver)),
  put: (path, resolver) => http.put(apiPath(path), wrap(resolver)),
  patch: (path, resolver) => http.patch(apiPath(path), wrap(resolver)),
  delete: (path, resolver) => http.delete(apiPath(path), wrap(resolver)),
};
