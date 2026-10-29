import { useQuery } from '@tanstack/react-query';
import { getAdminDesignations } from '@/services/adminCatalogService';
import { getAdminEnrollment, getAdminEnrollments } from '@/services/adminService';
import { queryKeys } from '@/services/queryKeys';
import { PUBLISH_STATUS } from '@/shared/constants';
import { OPTIONS_PAGE_LIMIT, OPTIONS_STALE_MS } from '../constants';

/**
 * DataTable fetcher for /admin/enrollments (KD8):
 * params = { page, limit, search, sort, status, designationId, from, to }.
 */
export const fetchAdminEnrollments = (params) => getAdminEnrollments(params);

/** One enrollment with `student`, `payments[]` (each with `events[]`) and `trainer` (EnrollmentDrawer). */
export function useAdminEnrollment(id) {
  return useQuery({
    queryKey: queryKeys.admin.enrollment(id),
    queryFn: () => getAdminEnrollment(id),
    enabled: Boolean(id),
  });
}

function selectDesignationOptions(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((designation) => ({
      value: designation._id,
      label:
        designation.status === PUBLISH_STATUS.DRAFT
          ? `${designation.name} (draft)`
          : designation.name || 'Unnamed designation',
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Every designation (drafts included) as Select options for the enrollment filter. */
export function useDesignationOptions() {
  const params = { page: 1, limit: OPTIONS_PAGE_LIMIT };
  return useQuery({
    queryKey: [...queryKeys.admin.designations, 'options', params],
    queryFn: () => getAdminDesignations(params),
    select: selectDesignationOptions,
    staleTime: OPTIONS_STALE_MS,
  });
}
