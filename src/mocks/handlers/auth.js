import { PASSWORD_MIN_LENGTH, ROLES, ROUTES, USER_STATUS, buildPath } from '@/shared/constants';
import { isValidEmail } from '@/shared/utils/helpers';
import { db, oid } from '../db';
import { hoursFromNow, randomToken } from '../seed/helpers';
import { publicUser, queueEmail } from '../services';
import {
  apiError,
  badRequest,
  clearRefreshSession,
  conflict,
  created,
  forbidden,
  getRefreshSession,
  issueAccessToken,
  json,
  mock,
  noContent,
  readJson,
  requireAuth,
  setRefreshSession,
  unauthorized,
  validationError,
} from '../utils';

/**
 * Auth endpoints (MM2, SD3; tickets SN3, SN4) — docs/API_CONTRACT.md "Auth".
 * Never returns passwords or tokens. Login, forgot-password and resend-verification answer the
 * same way whether or not an account exists, so they cannot be used to discover accounts.
 */

const TOKEN_TYPES = Object.freeze({ EMAIL_VERIFY: 'EMAIL_VERIFY', PASSWORD_RESET: 'PASSWORD_RESET' });
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 80;
const PASSWORD_MAX_LENGTH = 128;

const LOGIN_WINDOW_MS = 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

const MESSAGES = Object.freeze({
  invalidCredentials: 'Email or password is incorrect.',
  suspended: 'This account has been suspended. Contact support.',
  rateLimited: 'Too many attempts. Please wait a minute and try again.',
  emailTaken: 'An account with this email already exists.',
  sessionExpired: 'Your session has expired. Please log in again.',
  verifyInvalid: 'This verification link is invalid.',
  verifyUsed: 'This verification link was already used.',
  verifyExpired: 'This verification link has expired.',
  verified: 'Your email address is verified.',
  resendSent:
    'If this email belongs to an account that still needs verifying, we have sent a new verification link.',
  resetRequested: "If an account exists for this email, we've sent a password reset link.",
  resetInvalid: 'This password reset link is invalid or was already used.',
  resetExpired: 'This password reset link has expired.',
  resetDone: 'Your password has been updated. You can now log in.',
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Failed login timestamps per email (in memory only, like a real rate limiter's cache). */
const loginFailures = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function findUserByEmail(email) {
  if (!email) return undefined;
  return db.users.find((user) => String(user.email ?? '').toLowerCase() === email);
}

function isExpired(iso) {
  const time = new Date(iso ?? 0).getTime();
  return Number.isNaN(time) || time < Date.now();
}

function nameDetails(name) {
  if (!name) return [{ field: 'name', message: 'Enter your full name.' }];
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return [
      {
        field: 'name',
        message: `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`,
      },
    ];
  }
  return [];
}

function emailDetails(email) {
  if (!email) return [{ field: 'email', message: 'Enter your email address.' }];
  if (email.length > 254 || !isValidEmail(email)) {
    return [{ field: 'email', message: 'Enter a valid email address.' }];
  }
  return [];
}

function passwordDetails(password) {
  if (!password) return [{ field: 'password', message: 'Enter a password.' }];
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return [
      {
        field: 'password',
        message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and include a letter and a number.`,
      },
    ];
  }
  return [];
}

function recentLoginFailures(email, now) {
  const recent = (loginFailures.get(email) ?? []).filter((time) => now - time < LOGIN_WINDOW_MS);
  if (recent.length > 0) loginFailures.set(email, recent);
  else loginFailures.delete(email);
  return recent;
}

function recordLoginFailure(email, now) {
  loginFailures.set(email, [...recentLoginFailures(email, now), now]);
}

function createAuthToken(user, type, ttlHours) {
  const record = {
    _id: oid(),
    userId: user._id,
    type,
    token: randomToken(type === TOKEN_TYPES.EMAIL_VERIFY ? 'verify' : 'reset'),
    expiresAt: hoursFromNow(ttlHours),
    usedAt: null,
  };
  db.authTokens.push(record);
  return record;
}

function findAuthToken(type, token) {
  if (!token) return undefined;
  return db.authTokens.find((record) => record.type === type && record.token === token);
}

/** New EMAIL_VERIFY token (24 h) + a verify-email message in the mock inbox. */
function sendVerificationEmail(user) {
  const record = createAuthToken(user, TOKEN_TYPES.EMAIL_VERIFY, EMAIL_VERIFY_TTL_HOURS);
  queueEmail({
    to: user.email,
    template: 'verify-email',
    subject: 'Verify your email address',
    link: buildPath(ROUTES.VERIFY_EMAIL, {}, { token: record.token }),
    payload: { name: user.name, expiresAt: record.expiresAt },
  });
  return record;
}

/** New PASSWORD_RESET token (1 h); older unused reset links stop working. */
function sendPasswordResetEmail(user) {
  for (let index = db.authTokens.length - 1; index >= 0; index -= 1) {
    const record = db.authTokens[index];
    if (record.userId === user._id && record.type === TOKEN_TYPES.PASSWORD_RESET && !record.usedAt) {
      db.authTokens.splice(index, 1);
    }
  }
  const record = createAuthToken(user, TOKEN_TYPES.PASSWORD_RESET, PASSWORD_RESET_TTL_HOURS);
  queueEmail({
    to: user.email,
    template: 'reset-password',
    subject: 'Reset your password',
    link: buildPath(ROUTES.RESET_PASSWORD, {}, { token: record.token }),
    payload: { name: user.name, expiresAt: record.expiresAt },
  });
  return record;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const authHandlers = [
  mock.post('/auth/register', async ({ request }) => {
    const body = await readJson(request);
    const name = normalizeName(body.name);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    const details = [...nameDetails(name), ...emailDetails(email), ...passwordDetails(password)];
    if (details.length > 0) return validationError(details);

    if (findUserByEmail(email)) {
      return conflict('EMAIL_TAKEN', MESSAGES.emailTaken, [
        { field: 'email', message: MESSAGES.emailTaken },
      ]);
    }

    const timestamp = nowIso();
    const user = {
      _id: oid(),
      name,
      email,
      password,
      roles: [ROLES.STUDENT],
      status: USER_STATUS.PENDING_VERIFICATION,
      emailVerified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.users.push(user);
    sendVerificationEmail(user);

    return created({ user: publicUser(user) });
  }),

  mock.post('/auth/login', async ({ request }) => {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === 'string' ? body.password : '';

    const details = [];
    if (!email) details.push({ field: 'email', message: 'Enter your email address.' });
    if (!password) details.push({ field: 'password', message: 'Enter your password.' });
    if (details.length > 0) return validationError(details);

    const now = Date.now();
    if (recentLoginFailures(email, now).length > MAX_LOGIN_FAILURES) {
      return apiError(429, 'RATE_LIMITED', MESSAGES.rateLimited);
    }

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
      recordLoginFailure(email, now);
      return unauthorized(MESSAGES.invalidCredentials, 'INVALID_CREDENTIALS');
    }

    // Only after the password matched, so suspension status is never revealed to guessers.
    if (user.status === USER_STATUS.SUSPENDED) {
      return forbidden(MESSAGES.suspended, 'ACCOUNT_SUSPENDED');
    }

    // Unverified users can log in; they are only blocked from paying (EMAIL_NOT_VERIFIED).
    loginFailures.delete(email);
    setRefreshSession(user._id);
    return json({ accessToken: issueAccessToken(user._id), user: publicUser(user) });
  }),

  mock.post('/auth/refresh', () => {
    const userId = getRefreshSession();
    if (!userId) return unauthorized(MESSAGES.sessionExpired);
    const user = db.users.find((candidate) => candidate._id === userId);
    if (!user || user.status === USER_STATUS.SUSPENDED) {
      clearRefreshSession();
      return unauthorized(MESSAGES.sessionExpired);
    }
    return json({ accessToken: issueAccessToken(user._id), user: publicUser(user) });
  }),

  mock.post('/auth/logout', () => {
    clearRefreshSession();
    return noContent();
  }),

  mock.get('/auth/me', ({ request }) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;
    return json(publicUser(auth.user));
  }),

  mock.patch('/auth/me', async ({ request }) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const name = normalizeName(body.name);
    const details = nameDetails(name);
    if (details.length > 0) return validationError(details);

    auth.user.name = name;
    auth.user.updatedAt = nowIso();
    return json(publicUser(auth.user));
  }),

  mock.post('/auth/verify-email', async ({ request }) => {
    const body = await readJson(request);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const record = findAuthToken(TOKEN_TYPES.EMAIL_VERIFY, token);
    if (!record) return badRequest('TOKEN_INVALID', MESSAGES.verifyInvalid);
    if (record.usedAt) return badRequest('TOKEN_INVALID', MESSAGES.verifyUsed);
    if (isExpired(record.expiresAt)) return badRequest('TOKEN_EXPIRED', MESSAGES.verifyExpired);

    const user = db.users.find((candidate) => candidate._id === record.userId);
    if (!user) return badRequest('TOKEN_INVALID', MESSAGES.verifyInvalid);

    const timestamp = nowIso();
    record.usedAt = timestamp;
    user.emailVerified = true;
    if (user.status !== USER_STATUS.SUSPENDED) user.status = USER_STATUS.ACTIVE;
    user.updatedAt = timestamp;
    return json({ message: MESSAGES.verified });
  }),

  // Always 200 with the same message (contract): the response never says whether an account exists.
  mock.post('/auth/resend-verification', async ({ request }) => {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const user = emailDetails(email).length === 0 ? findUserByEmail(email) : undefined;
    if (user && !user.emailVerified && user.status !== USER_STATUS.SUSPENDED) {
      sendVerificationEmail(user);
    }
    return json({ message: MESSAGES.resendSent });
  }),

  // Always 200 with the same message (contract): the response never says whether an account exists.
  mock.post('/auth/forgot-password', async ({ request }) => {
    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const user = emailDetails(email).length === 0 ? findUserByEmail(email) : undefined;
    if (user) sendPasswordResetEmail(user);
    return json({ message: MESSAGES.resetRequested });
  }),

  mock.post('/auth/reset-password', async ({ request }) => {
    const body = await readJson(request);
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const record = findAuthToken(TOKEN_TYPES.PASSWORD_RESET, token);
    if (!record || record.usedAt) return badRequest('TOKEN_INVALID', MESSAGES.resetInvalid);
    if (isExpired(record.expiresAt)) return badRequest('TOKEN_EXPIRED', MESSAGES.resetExpired);

    const details = passwordDetails(password);
    if (details.length > 0) return validationError(details);

    const user = db.users.find((candidate) => candidate._id === record.userId);
    if (!user) return badRequest('TOKEN_INVALID', MESSAGES.resetInvalid);

    const timestamp = nowIso();
    user.password = password;
    user.updatedAt = timestamp;
    record.usedAt = timestamp;
    loginFailures.delete(normalizeEmail(user.email));
    // Changing the password ends every session (the refresh "cookie" of this browser included).
    clearRefreshSession();
    return json({ message: MESSAGES.resetDone });
  }),
];

export default authHandlers;
