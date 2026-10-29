import { useCallback, useEffect, useRef, useState } from 'react';
import * as authService from '@/services/authService';
import { getTokenErrorKind } from '../utils/authErrors';

/**
 * Verifies an email token exactly once per token (SN3).
 *
 * Deliberately not a React Query mutation: in StrictMode the dev-only effect re-run detaches a
 * mutation observer from a mutation started inside an effect, so its result would never arrive.
 * A ref guard keeps the request to one call per token; a request id ignores stale responses.
 *
 *   const { status, error, retry } = useVerifyEmail(token);
 *   status: 'verifying' | 'success' | 'expired' | 'invalid' | 'network' | 'error'
 */
export function useVerifyEmail(token) {
  const [result, setResult] = useState({ token: null, status: 'verifying', error: null });
  const startedFor = useRef(null);
  const requestId = useRef(0);

  const run = useCallback(async (value) => {
    requestId.current += 1;
    const id = requestId.current;
    setResult({ token: value, status: 'verifying', error: null });
    try {
      await authService.verifyEmail(value);
      if (id === requestId.current) setResult({ token: value, status: 'success', error: null });
    } catch (error) {
      if (id === requestId.current) {
        setResult({ token: value, status: getTokenErrorKind(error) ?? 'error', error });
      }
    }
  }, []);

  useEffect(() => {
    if (!token || startedFor.current === token) return;
    startedFor.current = token;
    run(token);
  }, [token, run]);

  const retry = useCallback(() => {
    if (token) run(token);
  }, [token, run]);

  if (!token) return { status: 'invalid', error: null, retry };
  if (result.token !== token) return { status: 'verifying', error: null, retry };
  return { status: result.status, error: result.error, retry };
}

export default useVerifyEmail;
