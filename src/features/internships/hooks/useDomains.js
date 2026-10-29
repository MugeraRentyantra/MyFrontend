import { useQuery } from '@tanstack/react-query';
import { getDomains } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;

const selectItems = (list) => (Array.isArray(list?.items) ? list.items : []);

/** Published domains (public). `data` is an array. */
export function useDomains(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.catalog.domains(),
    queryFn: () => getDomains(),
    select: selectItems,
    staleTime: CATALOG_STALE_TIME_MS,
    enabled,
  });
}

export default useDomains;
