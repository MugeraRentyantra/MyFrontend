import { getAuditLogs } from '@/services/adminService';
import { ROLES } from '@/shared/constants';
import { useUserOptions } from './useAdminUsers';

/**
 * DataTable fetcher for /admin/audit (GP13):
 * params = { page, limit, search, sort, action, actorId, entityType, from, to }. Newest first by default.
 */
export const fetchAuditLogs = (params) => getAuditLogs(params);

/** Admins as Select options for the "actor" filter (only admins write audit entries). */
export function useAuditActorOptions() {
  return useUserOptions({ role: ROLES.ADMIN });
}
