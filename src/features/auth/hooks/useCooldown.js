import { useCallback, useEffect, useState } from 'react';

const TICK_MS = 500;

/**
 * A countdown used to rate-limit "resend" buttons.
 *   const { remaining, isActive, start, reset } = useCooldown(30);
 * `remaining` is in whole seconds (0 when idle). The interval is cleared on unmount.
 */
export function useCooldown(durationSeconds) {
  const [endsAt, setEndsAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return undefined;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) setEndsAt(null);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const start = useCallback(() => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + Math.max(0, Number(durationSeconds) || 0) * 1000);
  }, [durationSeconds]);

  const reset = useCallback(() => setEndsAt(null), []);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));

  return { remaining, isActive: remaining > 0, start, reset };
}

export default useCooldown;
