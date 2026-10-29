import { ROLES } from '@/shared/constants';
import { slugify } from '@/shared/utils/helpers';
import { db, oid } from '../db';
import { addMinutes, randomToken } from '../seed/helpers';
import { badRequest, getQuery, json, mock, noContent, requireAuth } from '../utils';

/**
 * GitHub OAuth (SD9) for the mock API. The "authorization URL" points straight back to the app's
 * /github/callback with a mock code, standing in for GitHub's consent screen. Tokens never exist
 * here and are never returned: only the username, scopes and connection date.
 *
 * Pending OAuth states are kept per user in a module-level Map that is mirrored to localStorage,
 * because the redirect to the callback reloads the page (and with it this module).
 */

const STATE_TTL_MINUTES = 10;
const USED_STATE_GRACE_MINUTES = 5;
const STATES_STORAGE_KEY = 'ip.mock.githubOAuthStates';
const DEFAULT_SCOPES = ['read:user', 'public_repo'];
const AUTH_FAILED_MESSAGE = 'GitHub authorization failed. Please try again.';

/** userId -> { state, code, expiresAt, usedAt } */
const pendingStates = new Map();
let statesLoaded = false;

function storage() {
  try {
    const store = globalThis.localStorage;
    return store && typeof store.getItem === 'function' ? store : null;
  } catch {
    return null;
  }
}

function loadStates() {
  if (statesLoaded) return;
  statesLoaded = true;
  const store = storage();
  if (!store) return;
  try {
    const saved = JSON.parse(store.getItem(STATES_STORAGE_KEY) || '{}');
    if (saved && typeof saved === 'object') {
      Object.entries(saved).forEach(([userId, entry]) => {
        if (entry && typeof entry.state === 'string') pendingStates.set(userId, entry);
      });
    }
  } catch {
    // corrupted entry: start clean
  }
}

function saveStates() {
  const store = storage();
  if (!store) return;
  try {
    const now = Date.now();
    const live = {};
    pendingStates.forEach((entry, userId) => {
      if (new Date(entry.expiresAt).getTime() > now) live[userId] = entry;
    });
    if (Object.keys(live).length === 0) store.removeItem(STATES_STORAGE_KEY);
    else store.setItem(STATES_STORAGE_KEY, JSON.stringify(live));
  } catch {
    // storage full or blocked: the in-memory Map still works within this page load
  }
}

function appOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'http://localhost:5173';
}

/** "Diya Patel" -> "diya-patel-dev" (GitHub logins: letters, digits, single hyphens, <= 39). */
function usernameFor(user) {
  const base = slugify(user?.name || '') || slugify(String(user?.email || '').split('@')[0]);
  const trimmed = (base || 'student').slice(0, 35).replace(/-+$/g, '');
  return `${trimmed || 'student'}-dev`;
}

function connectionFor(userId) {
  return db.githubConnections.find((connection) => connection.userId === userId) ?? null;
}

function connectionDto(connection) {
  if (!connection) {
    return { connected: false, githubUsername: null, scopes: [], connectedAt: null };
  }
  return {
    connected: true,
    githubUsername: connection.githubUsername,
    scopes: Array.isArray(connection.scopes) ? [...connection.scopes] : [],
    connectedAt: connection.connectedAt,
  };
}

function upsertConnection(user) {
  const now = new Date().toISOString();
  const existing = connectionFor(user._id);
  if (existing) {
    existing.githubUsername = existing.githubUsername || usernameFor(user);
    existing.scopes = [...DEFAULT_SCOPES];
    existing.connectedAt = now;
    return existing;
  }
  const connection = {
    _id: oid(),
    userId: user._id,
    githubUsername: usernameFor(user),
    scopes: [...DEFAULT_SCOPES],
    connectedAt: now,
  };
  db.githubConnections.push(connection);
  return connection;
}

export const githubHandlers = [
  // POST /github/connect -> { authorizationUrl, state }
  mock.post('/github/connect', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const { user } = auth;

    loadStates();
    const state = randomToken('state');
    const code = randomToken('mock');
    pendingStates.set(user._id, {
      state,
      code,
      expiresAt: addMinutes(new Date().toISOString(), STATE_TTL_MINUTES),
      usedAt: null,
    });
    saveStates();

    const query = new URLSearchParams({ code, state }).toString();
    return json({ authorizationUrl: `${appOrigin()}/github/callback?${query}`, state });
  }),

  // GET /github/callback?code&state -> { connected: true, githubUsername }
  mock.get('/github/callback', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const { user } = auth;

    const query = getQuery(request);
    const code = query.get('code') || '';
    const state = query.get('state') || '';

    loadStates();
    const pending = pendingStates.get(user._id);
    const now = Date.now();
    const valid =
      Boolean(code && state && pending) &&
      pending.state === state &&
      pending.code === code &&
      new Date(pending.expiresAt).getTime() > now;
    if (!valid) return badRequest('TOKEN_INVALID', AUTH_FAILED_MESSAGE);

    // The same callback replayed shortly after success (e.g. a reload) is answered idempotently.
    if (pending.usedAt) {
      const existing = connectionFor(user._id);
      if (!existing) return badRequest('TOKEN_INVALID', AUTH_FAILED_MESSAGE);
      return json({ connected: true, githubUsername: existing.githubUsername });
    }

    const connection = upsertConnection(user);
    pendingStates.set(user._id, {
      ...pending,
      usedAt: new Date(now).toISOString(),
      expiresAt: addMinutes(new Date(now).toISOString(), USED_STATE_GRACE_MINUTES),
    });
    saveStates();

    return json({ connected: true, githubUsername: connection.githubUsername });
  }),

  // GET /github/connection -> { connected, githubUsername, scopes, connectedAt } (never a token)
  mock.get('/github/connection', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    return json(connectionDto(connectionFor(auth.user._id)));
  }),

  // DELETE /github/connection -> 204 (idempotent)
  mock.delete('/github/connection', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const { user } = auth;

    for (let index = db.githubConnections.length - 1; index >= 0; index -= 1) {
      if (db.githubConnections[index].userId === user._id) db.githubConnections.splice(index, 1);
    }
    loadStates();
    if (pendingStates.delete(user._id)) saveStates();
    return noContent();
  }),
];

export default githubHandlers;
