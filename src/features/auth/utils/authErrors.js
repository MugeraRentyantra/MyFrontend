import {
  applyServerErrors,
  getErrorCode,
  getErrorMessage,
  getErrorStatus,
  isNetworkError,
} from '@/shared/utils/errors';

/** Error codes the auth API can return (docs/API_CONTRACT.md). */
export const AUTH_ERROR_CODES = Object.freeze({
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  RATE_LIMITED: 'RATE_LIMITED',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
});

/** Server `details[]` entries that belong to one of `fields`. */
function knownFieldDetails(error, fields) {
  if (!error || !Array.isArray(error.details)) return [];
  return error.details.filter(
    (detail) => detail && typeof detail.field === 'string' && fields.includes(detail.field),
  );
}

/** True when the error carries at least one field-level message for one of `fields`. */
export function hasKnownFieldErrors(error, fields) {
  return knownFieldDetails(error, fields).length > 0;
}

/**
 * Copies server field errors into react-hook-form, but only for fields the form renders
 * (a detail for an unknown field would otherwise be set on a field nobody can see).
 * Returns the first field that received an error, or null.
 */
export function applyKnownFieldErrors(error, setError, fields) {
  const details = knownFieldDetails(error, fields);
  if (details.length === 0) return null;
  applyServerErrors({ details }, setError);
  return details[0].field;
}

/**
 * Banner content for a failed request on an auth form.
 *   kind: 'network' | 'credentials' | 'suspended' | 'rate-limited' | 'generic'
 * Login errors use one message for an unknown email and a wrong password (SN3).
 */
export function describeAuthError(error) {
  if (!error) return null;
  if (isNetworkError(error)) {
    return {
      kind: 'network',
      title: "Can't reach the server",
      description: 'Check your internet connection and try again.',
    };
  }
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  if (code === AUTH_ERROR_CODES.ACCOUNT_SUSPENDED) {
    return {
      kind: 'suspended',
      title: 'This account has been suspended. Contact support.',
      description: null,
    };
  }
  if (status === 429 || code === AUTH_ERROR_CODES.RATE_LIMITED) {
    return {
      kind: 'rate-limited',
      title: 'Too many attempts. Please wait a minute and try again.',
      description: null,
    };
  }
  if (status !== null && status >= 500) {
    return {
      kind: 'generic',
      title: 'Something went wrong on our side',
      description: getErrorMessage(error),
    };
  }
  return { kind: 'generic', title: getErrorMessage(error), description: null };
}

/** Same as describeAuthError, plus the single "incorrect details" message for 401s. */
export function describeLoginError(error) {
  if (!error) return null;
  const status = getErrorStatus(error);
  const code = getErrorCode(error);
  if (!isNetworkError(error) && (status === 401 || code === AUTH_ERROR_CODES.INVALID_CREDENTIALS)) {
    return { kind: 'credentials', title: 'Email or password is incorrect.', description: null };
  }
  return describeAuthError(error);
}

/**
 * How a verification / reset token failed:
 *   'expired' | 'invalid' (unknown, already used or missing) | 'network' | 'error' (retryable)
 */
export function getTokenErrorKind(error) {
  if (!error) return null;
  if (isNetworkError(error)) return 'network';
  const code = getErrorCode(error);
  if (code === AUTH_ERROR_CODES.TOKEN_EXPIRED) return 'expired';
  if (code === AUTH_ERROR_CODES.TOKEN_INVALID) return 'invalid';
  const status = getErrorStatus(error);
  if (status === 410) return 'expired';
  if (status === 400 || status === 404) return 'invalid';
  return 'error';
}

/**
 * Forgot password never reveals whether an account exists: only problems that mean the request
 * did not get through (offline, rate limited, server failure) are shown to the user.
 */
export function shouldShowForgotPasswordError(error) {
  if (!error) return false;
  if (isNetworkError(error)) return true;
  const status = getErrorStatus(error);
  return status === 422 || status === 429 || (status !== null && status >= 500);
}
