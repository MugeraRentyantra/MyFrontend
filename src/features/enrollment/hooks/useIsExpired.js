import { useEffect, useReducer } from 'react';
import { isPast } from '@/shared/utils/helpers';

/** setTimeout cannot wait longer than this (about 24.8 days). */
const MAX_TIMEOUT_MS = 2147483647;

/**
 * True once `expiresAt` (ISO string) is in the past. The component re-renders at the moment the
 * time passes, so a price quote turns into the "expired" state without a refresh.
 */
export function useIsExpired(expiresAt) {
  const [tick, forceRender] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    if (!expiresAt) return undefined;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return undefined;
    // Re-arms itself (via `tick`) if the wait had to be capped.
    const timer = setTimeout(forceRender, Math.min(remaining + 250, MAX_TIMEOUT_MS));
    return () => clearTimeout(timer);
  }, [expiresAt, tick]);

  return isPast(expiresAt);
}

export default useIsExpired;
