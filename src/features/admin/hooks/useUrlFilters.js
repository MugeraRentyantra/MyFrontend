import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filter state kept in the URL query string (e.g. /admin/payments?status=FAILED&flagged=true), so the
 * dashboard can link to a filtered list, filtered views can be shared and a reload keeps them.
 *
 *   const { values, setValue, setValues, clear, activeCount } = useUrlFilters(['status', 'from', 'to']);
 *
 * Missing params read as ''. Writes replace the current history entry and drop empty values; params
 * that are not listed in `keys` are left untouched.
 */
export function useUrlFilters(keys) {
  const [searchParams, setSearchParams] = useSearchParams();
  const signature = keys.join('|');

  const values = useMemo(() => {
    const result = {};
    signature.split('|').forEach((key) => {
      if (key) result[key] = searchParams.get(key) ?? '';
    });
    return result;
  }, [searchParams, signature]);

  const setValues = useCallback(
    (patch) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setValue = useCallback((key, value) => setValues({ [key]: value }), [setValues]);

  /** Clears the given keys (default: every key this hook manages). */
  const clear = useCallback(
    (only) => {
      const targets = Array.isArray(only) && only.length ? only : signature.split('|');
      setValues(Object.fromEntries(targets.filter(Boolean).map((key) => [key, ''])));
    },
    [setValues, signature],
  );

  const activeCount = Object.values(values).filter(Boolean).length;

  return { values, setValue, setValues, clear, activeCount };
}

export default useUrlFilters;
