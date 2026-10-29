import { useQuery } from '@tanstack/react-query';
import { getPlans, getSchedulePreview } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';
import { cleanParams } from '@/shared/utils/helpers';

const selectItems = (list) => (Array.isArray(list?.items) ? list.items : []);

/**
 * Published plans (public). params: { designationId, domainId, durationMonths }.
 * `data` is an array of Plan (with designation/domain refs and integer-paise basePrice).
 */
export function usePlans(params = {}, options = {}) {
  const { enabled = true } = options;
  const cleaned = cleanParams(params);
  return useQuery({
    queryKey: queryKeys.catalog.plans(cleaned),
    queryFn: () => getPlans(cleaned),
    select: selectItems,
    staleTime: 60 * 1000,
    enabled,
  });
}

/** Day titles of a plan's published schedule: { planId, totalDays, days: [{ dayNumber, title }] }. */
export function useSchedulePreview(planId, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.catalog.schedulePreview(planId),
    queryFn: () => getSchedulePreview(planId),
    enabled: Boolean(planId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export default usePlans;
