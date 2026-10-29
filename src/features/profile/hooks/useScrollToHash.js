import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to (and focuses) the element whose id matches the URL hash once `ready` is true,
 * e.g. /profile#github after the GitHub OAuth callback. Handled once per navigation.
 * The target should carry `tabIndex={-1}` and a scroll margin for the sticky top bar.
 */
export function useScrollToHash(ready = true) {
  const { hash, key } = useLocation();
  const handledKey = useRef(null);

  useEffect(() => {
    if (!ready || !hash || hash.length < 2 || handledKey.current === key) return undefined;
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep the raw value
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (!target) return;
      handledKey.current = key;
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, hash, key]);
}

export default useScrollToHash;
