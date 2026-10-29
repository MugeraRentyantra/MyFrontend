import { useQuery } from '@tanstack/react-query';
import { getDesignations, getPlans } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';

/** The public catalog changes rarely: keep it fresh for 5 minutes. */
const CATALOG_STALE_MS = 5 * 60 * 1000;
const DESIGNATION_PARAMS = { limit: 50 };

const selectItems = (data) => data?.items ?? [];

/** Published designations for the team plan picker (array). */
export function usePublishedDesignations() {
  return useQuery({
    queryKey: queryKeys.catalog.designations(DESIGNATION_PARAMS),
    queryFn: () => getDesignations(DESIGNATION_PARAMS),
    select: selectItems,
    staleTime: CATALOG_STALE_MS,
  });
}

/** Published plans of one designation (array of Plan with designation/domain refs). */
export function useDesignationPlans(designationId) {
  return useQuery({
    queryKey: queryKeys.catalog.plans({ designationId }),
    queryFn: () => getPlans({ designationId }),
    select: selectItems,
    enabled: Boolean(designationId),
    staleTime: CATALOG_STALE_MS,
  });
}

/**
 * One published plan by id (there is no GET /internship-plans/:id): looks it up in the designation's
 * plans when the designation is known, else in the full published list. data = Plan | null.
 */
export function usePlanById(planId, designationId) {
  const params = designationId ? { designationId } : {};
  return useQuery({
    queryKey: queryKeys.catalog.plans(params),
    queryFn: () => getPlans(params),
    select: (data) => selectItems(data).find((plan) => plan?._id === planId) ?? null,
    enabled: Boolean(planId),
    staleTime: CATALOG_STALE_MS,
  });
}
