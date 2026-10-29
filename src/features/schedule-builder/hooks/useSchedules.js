import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import {
  cloneSchedule,
  createSchedule,
  getSchedule,
  getSchedules,
  getScheduleVersions,
} from '@/services/adminScheduleService';
import { getAdminDesignations, getAdminDomains } from '@/services/adminCatalogService';
import { PUBLISH_STATUS, SCHEDULE_STATUS } from '@/shared/constants';

const EMPTY_LIST = [];
const OPTIONS_STALE_MS = 5 * 60 * 1000;

/** Accepts `{ items }` lists and plain arrays. */
export function toItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return EMPTY_LIST;
}

function toCatalogOptions(data) {
  return toItems(data)
    .map((item) => ({
      value: item._id,
      label: item.status === PUBLISH_STATUS.DRAFT ? `${item.name} (draft)` : item.name,
      name: item.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function selectVersions(data) {
  return [...toItems(data)].sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

/** Designation + domain options for filters and the "New schedule" dialog. */
export function useScheduleCatalogOptions() {
  const designations = useQuery({
    queryKey: [...queryKeys.admin.designations, 'options'],
    queryFn: () => getAdminDesignations({ limit: 200 }),
    select: toCatalogOptions,
    staleTime: OPTIONS_STALE_MS,
  });
  const domains = useQuery({
    queryKey: [...queryKeys.admin.domains, 'options'],
    queryFn: () => getAdminDomains({ limit: 200 }),
    select: toCatalogOptions,
    staleTime: OPTIONS_STALE_MS,
  });

  const { refetch: refetchDesignations } = designations;
  const { refetch: refetchDomains } = domains;
  const refetch = useCallback(() => {
    refetchDesignations();
    refetchDomains();
  }, [refetchDesignations, refetchDomains]);

  return {
    designations: designations.data ?? EMPTY_LIST,
    domains: domains.data ?? EMPTY_LIST,
    isLoading: designations.isLoading || domains.isLoading,
    isError: designations.isError || domains.isError,
    error: designations.error ?? domains.error ?? null,
    refetch,
  };
}

/** One schedule template with its days. */
export function useSchedule(id) {
  return useQuery({
    queryKey: queryKeys.admin.schedule(id),
    queryFn: () => getSchedule(id),
    enabled: Boolean(id),
  });
}

/** Every version of the same designation / domain / duration, newest first. */
export function useScheduleVersions(id) {
  return useQuery({
    queryKey: queryKeys.admin.scheduleVersions(id),
    queryFn: () => getScheduleVersions(id),
    enabled: Boolean(id),
    select: selectVersions,
  });
}

/**
 * The newest DRAFT for a designation / domain / duration, if one exists (used to warn before
 * creating another draft). `data` is the draft summary or null.
 */
export function useExistingDraft({ designationId, domainId, durationMonths }) {
  const enabled = Boolean(designationId && domainId && durationMonths);
  const params = {
    designationId,
    domainId,
    durationMonths: Number(durationMonths) || undefined,
    status: SCHEDULE_STATUS.DRAFT,
    sort: 'version:desc',
    limit: 1,
  };
  return useQuery({
    queryKey: [...queryKeys.admin.schedules, 'existing-draft', params],
    queryFn: () => getSchedules(params),
    enabled,
    select: (data) => toItems(data)[0] ?? null,
    staleTime: 30 * 1000,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => createSchedule(data),
    onSuccess: (schedule) => {
      if (schedule?._id) queryClient.setQueryData(queryKeys.admin.schedule(schedule._id), schedule);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules });
    },
  });
}

/** POST /admin/schedules/:id/clone -> a new DRAFT (days and tasks copied). */
export function useCloneSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => cloneSchedule(id),
    onSuccess: (schedule) => {
      if (schedule?._id) queryClient.setQueryData(queryKeys.admin.schedule(schedule._id), schedule);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules });
    },
  });
}

const FILTER_KEYS = ['designationId', 'domainId', 'status'];

/** List filters kept in the URL (?designationId=&domainId=&status=) so they survive reloads and Back. */
export function useScheduleListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const designationId = searchParams.get('designationId') ?? '';
  const domainId = searchParams.get('domainId') ?? '';
  const status = searchParams.get('status') ?? '';

  const filters = useMemo(() => ({ designationId, domainId, status }), [designationId, domainId, status]);

  const setFilters = useCallback(
    (next) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous);
          FILTER_KEYS.forEach((key) => {
            const value = next?.[key];
            if (value) params.set(key, value);
            else params.delete(key);
          });
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [filters, setFilters];
}
