import { useQuery } from '@tanstack/react-query';
import { getPlans } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Published plans a student can enroll in (array). Pass a designation id to limit the list to
 * that designation; without one every published plan is returned (used to resolve a plan id
 * from a link that has no designation).
 */
export function usePlanOptions(designationId, options = {}) {
  const params = designationId ? { designationId } : {};
  return useQuery({
    queryKey: queryKeys.catalog.plans(params),
    queryFn: () => getPlans(params),
    select: (data) => data?.items ?? [],
    ...options,
  });
}

export default usePlanOptions;
