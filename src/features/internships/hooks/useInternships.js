import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getDesignations, getPlans } from '@/services/internshipService';
import { queryKeys } from '@/services/queryKeys';
import { CURRENCY } from '@/shared/constants';
import { useDomains } from './useDomains';

const CATALOG_STALE_TIME_MS = 60 * 1000;
const ALL_PLANS_PARAMS = Object.freeze({});

const byName = (a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''));

/**
 * Joins published designations with published plans into one summary per designation:
 *   [{ designation, plans[], minPrice (paise | null), currency, durations[], domains[] }]
 * `minPrice` is the lowest server price among the matching plans (selected, never calculated).
 * With a domain or duration filter, designations without a matching plan are left out.
 */
export function buildInternshipSummaries(designations = [], plans = [], filters = {}) {
  const domainId = filters.domainId ? String(filters.domainId) : '';
  const durationMonths = filters.durationMonths ? Number(filters.durationMonths) : null;
  const hasPlanFilter = Boolean(domainId) || durationMonths !== null;

  const plansByDesignation = new Map();
  plans.forEach((plan) => {
    if (domainId && plan.domainId !== domainId) return;
    if (durationMonths !== null && Number(plan.durationMonths) !== durationMonths) return;
    const list = plansByDesignation.get(plan.designationId) ?? [];
    list.push(plan);
    plansByDesignation.set(plan.designationId, list);
  });

  return designations.reduce((summaries, designation) => {
    const matching = plansByDesignation.get(designation._id) ?? [];
    if (hasPlanFilter && matching.length === 0) return summaries;

    const prices = matching
      .map((plan) => Number(plan.basePrice))
      .filter((price) => Number.isFinite(price));
    const durations = [...new Set(matching.map((plan) => Number(plan.durationMonths)))]
      .filter((months) => Number.isFinite(months))
      .sort((a, b) => a - b);

    const domainsById = new Map();
    matching.forEach((plan) => {
      const ref = plan.domain ?? { _id: plan.domainId, name: '', slug: '' };
      if (ref?._id && !domainsById.has(ref._id)) domainsById.set(ref._id, ref);
    });

    summaries.push({
      designation,
      plans: matching,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      currency: matching[0]?.currency ?? CURRENCY,
      durations,
      domains: [...domainsById.values()].sort(byName),
    });
    return summaries;
  }, []);
}

/**
 * Catalog data for the home and catalog pages (SN5).
 * filters: { search, domainId, durationMonths } — search runs on the server, the plan filters
 * are applied to the joined summaries. Returns React Query-like flags plus `domains` for filters.
 */
export function useInternships(filters = {}) {
  const { search = '', domainId = '', durationMonths = '' } = filters;
  const trimmedSearch = String(search ?? '').trim();
  const designationParams = useMemo(
    () => (trimmedSearch ? { search: trimmedSearch } : {}),
    [trimmedSearch],
  );

  const designationsQuery = useQuery({
    queryKey: queryKeys.catalog.designations(designationParams),
    queryFn: () => getDesignations(designationParams),
    placeholderData: keepPreviousData,
    staleTime: CATALOG_STALE_TIME_MS,
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.catalog.plans(ALL_PLANS_PARAMS),
    queryFn: () => getPlans(ALL_PLANS_PARAMS),
    staleTime: CATALOG_STALE_TIME_MS,
  });

  const domainsQuery = useDomains();

  const designations = designationsQuery.data?.items;
  const plans = plansQuery.data?.items;

  const data = useMemo(() => {
    if (!Array.isArray(designations) || !Array.isArray(plans)) return undefined;
    return buildInternshipSummaries(designations, plans, { domainId, durationMonths });
  }, [designations, plans, domainId, durationMonths]);

  const { refetch: refetchDesignations } = designationsQuery;
  const { refetch: refetchPlans } = plansQuery;
  const refetch = useCallback(
    () => Promise.all([refetchDesignations(), refetchPlans()]),
    [refetchDesignations, refetchPlans],
  );

  return {
    data,
    domains: domainsQuery.data ?? [],
    domainsLoading: domainsQuery.isLoading,
    isLoading: designationsQuery.isLoading || plansQuery.isLoading,
    isFetching: designationsQuery.isFetching || plansQuery.isFetching,
    isPlaceholderData: designationsQuery.isPlaceholderData,
    isError: designationsQuery.isError || plansQuery.isError,
    error: designationsQuery.error ?? plansQuery.error ?? null,
    refetch,
  };
}

export default useInternships;
