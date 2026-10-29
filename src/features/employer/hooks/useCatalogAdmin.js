import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDesignation,
  createDomain,
  getAdminDesignations,
  getAdminDomains,
  setDesignationStatus,
  setDomainStatus,
  updateDesignation,
  updateDomain,
} from '@/services/adminCatalogService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Admin catalog: designations and domains (KD3, MM4, MM5). Both share one shape and one set of
 * rules, so every hook takes a `kind` ('designation' | 'domain').
 */

/** The option lists load the whole catalog in one page (it holds a few dozen entries at most). */
export const CATALOG_OPTIONS_LIMIT = 200;

export const CATALOG_KINDS = Object.freeze({
  designation: Object.freeze({
    kind: 'designation',
    singular: 'designation',
    plural: 'designations',
    title: 'Designation',
    titlePlural: 'Designations',
    queryKey: queryKeys.admin.designations,
    list: getAdminDesignations,
    create: createDesignation,
    update: updateDesignation,
    setStatus: setDesignationStatus,
  }),
  domain: Object.freeze({
    kind: 'domain',
    singular: 'domain',
    plural: 'domains',
    title: 'Domain',
    titlePlural: 'Domains',
    queryKey: queryKeys.admin.domains,
    list: getAdminDomains,
    create: createDomain,
    update: updateDomain,
    setStatus: setDomainStatus,
  }),
});

export function getCatalogKind(kind) {
  return CATALOG_KINDS[kind] ?? CATALOG_KINDS.designation;
}

/**
 * Names and availability of designations/domains show up in plans, assessments, schedules and the
 * public catalog, so a catalog change refreshes all of them.
 */
export function invalidateCatalogQueries(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.designations }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.domains }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.assessments }),
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules }),
    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all }),
  ]);
}

const selectItems = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

/** Every designation or domain (drafts included), sorted by name — for filters and form selects. */
export function useCatalogOptions(kind, options = {}) {
  const config = getCatalogKind(kind);
  return useQuery({
    queryKey: [...config.queryKey, 'options'],
    queryFn: () => config.list({ page: 1, limit: CATALOG_OPTIONS_LIMIT, sort: 'name:asc' }),
    select: selectItems,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useCreateCatalogItem(kind) {
  const queryClient = useQueryClient();
  const config = getCatalogKind(kind);
  return useMutation({
    mutationFn: (values) => config.create(values),
    onSuccess: () => {
      invalidateCatalogQueries(queryClient);
    },
  });
}

/** mutate({ id, values: { name, description } }) */
export function useUpdateCatalogItem(kind) {
  const queryClient = useQueryClient();
  const config = getCatalogKind(kind);
  return useMutation({
    mutationFn: ({ id, values }) => config.update(id, values),
    onSuccess: () => {
      invalidateCatalogQueries(queryClient);
    },
  });
}

/** mutate({ id, status: 'PUBLISHED' | 'DRAFT' }) */
export function useSetCatalogStatus(kind) {
  const queryClient = useQueryClient();
  const config = getCatalogKind(kind);
  return useMutation({
    mutationFn: ({ id, status }) => config.setStatus(id, status),
    onSuccess: () => {
      invalidateCatalogQueries(queryClient);
    },
  });
}
