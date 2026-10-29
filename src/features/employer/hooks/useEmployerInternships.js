import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPlan, getAdminPlans, setPlanStatus, updatePlan } from '@/services/adminCatalogService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Internship plans and pricing (KD4, MM6). A plan = designation + domain + duration with a base
 * price in integer paise. Price edits only affect new quotes: existing quotes and enrollments keep
 * their own price snapshot on the server.
 */

/** DataTable fetcher: params = { page, limit, search, sort, designationId, domainId, status }. */
export const fetchAdminPlans = (params) => getAdminPlans(params);

export function useAdminPlans(params = {}, options = {}) {
  return useQuery({
    queryKey: [...queryKeys.admin.plans, params],
    queryFn: () => getAdminPlans(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

function invalidatePlanQueries(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans }),
    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all }),
  ]);
}

/** mutate({ designationId, domainId, durationMonths, basePrice (paise), status? }) */
export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values) => createPlan(values),
    onSuccess: () => {
      invalidatePlanQueries(queryClient);
    },
  });
}

/** mutate({ id, values: { basePrice (paise), durationMonths?, domainId? } }) */
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }) => updatePlan(id, values),
    onSuccess: () => {
      invalidatePlanQueries(queryClient);
    },
  });
}

/** mutate({ id, status: 'PUBLISHED' | 'DRAFT' }) */
export function useSetPlanStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => setPlanStatus(id, status),
    onSuccess: () => {
      invalidatePlanQueries(queryClient);
    },
  });
}
