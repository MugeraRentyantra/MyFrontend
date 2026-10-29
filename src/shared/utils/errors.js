/**
 * Helpers for the normalised ApiError thrown by services/api.js:
 *   { name: 'ApiError', status, code, message, details: [{ field, message }], isNetworkError }
 */

export const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export function getErrorMessage(error, fallback = DEFAULT_ERROR_MESSAGE) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || fallback;
}

export function getErrorCode(error) {
  return error?.code ?? null;
}

export function getErrorStatus(error) {
  return error?.status ?? null;
}

export function isErrorCode(error, code) {
  return Boolean(error) && error.code === code;
}

export function isNetworkError(error) {
  return Boolean(error?.isNetworkError);
}

/** details[] -> { field: message } */
export function getFieldErrors(error) {
  const details = error?.details;
  if (!Array.isArray(details)) return {};
  return details.reduce((acc, detail) => {
    if (detail?.field && !acc[detail.field]) acc[detail.field] = detail.message;
    return acc;
  }, {});
}

/**
 * Copies server field errors into react-hook-form. Returns true if at least one field
 * error was applied (so the caller can skip a generic toast).
 *   applyServerErrors(err, setError, { fieldMap: { screenshots: 'files' } })
 */
export function applyServerErrors(error, setError, { fieldMap = {} } = {}) {
  const fields = getFieldErrors(error);
  let applied = false;
  Object.entries(fields).forEach(([field, message]) => {
    setError(fieldMap[field] ?? field, { type: 'server', message });
    applied = true;
  });
  return applied;
}
