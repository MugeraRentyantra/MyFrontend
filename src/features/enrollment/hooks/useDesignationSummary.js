import { useQuery } from '@tanstack/react-query';
import { getDesignation } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';

/** A published designation by id (name and description for page headings). */
export function useDesignationSummary(designationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.catalog.designation(designationId),
    queryFn: () => getDesignation(designationId),
    enabled: Boolean(designationId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export default useDesignationSummary;
