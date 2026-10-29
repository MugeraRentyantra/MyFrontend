import { useQuery } from '@tanstack/react-query';
import { getDesignation } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';

/** A published designation by slug or id (public). 404 surfaces as an ApiError with status 404. */
export function useDesignation(idOrSlug, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.catalog.designation(idOrSlug),
    queryFn: () => getDesignation(idOrSlug),
    enabled: Boolean(idOrSlug) && enabled,
    staleTime: 60 * 1000,
  });
}

export default useDesignation;
