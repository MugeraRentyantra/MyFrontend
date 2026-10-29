import { getFieldErrors } from '@/shared/utils/errors';

/**
 * Copies server field errors (ApiError.details) onto the form fields this form actually renders.
 * Returns true when at least one was applied; otherwise the caller shows the message at form level.
 *   applyKnownFieldErrors(error, setError, ['name', 'description'])
 */
export function applyKnownFieldErrors(error, setError, fields, { fieldMap = {} } = {}) {
  const fieldErrors = getFieldErrors(error);
  let applied = false;
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const target = fieldMap[field] ?? field;
    if (!fields.includes(target)) return;
    setError(target, { type: 'server', message }, { shouldFocus: !applied });
    applied = true;
  });
  return applied;
}
