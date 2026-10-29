import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUserRoles, updateUserStatus } from '@/services/adminService';
import { queryKeys } from '@/services/queryKeys';
import { OPTIONS_PAGE_LIMIT, OPTIONS_STALE_MS } from '../constants';

/** DataTable fetcher for /admin/users (GP7): params = { page, limit, search, sort, role, status }. */
export const fetchAdminUsers = (params) => getUsers(params);

/** After a role or status change: the user list, the dashboard counts and the audit log are stale. */
function useInvalidateUserData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats }),
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit }),
    ]);
}

/** PATCH /admin/users/:id/roles — mutate({ id, roles }) resolves to the updated User. */
export function useUpdateUserRoles() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: ({ id, roles }) => updateUserRoles(id, roles),
    onSuccess: () => invalidate(),
  });
}

/** PATCH /admin/users/:id/status — mutate({ id, status: 'ACTIVE' | 'SUSPENDED' }). */
export function useUpdateUserStatus() {
  const invalidate = useInvalidateUserData();
  return useMutation({
    mutationFn: ({ id, status }) => updateUserStatus(id, status),
    onSuccess: () => invalidate(),
  });
}

function selectUserOptions(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((user) => ({ value: user._id, label: user.name || user.email || 'Unnamed user' }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Users as Select options ({ value: _id, label: name }), e.g. useUserOptions({ role: 'ADMIN' })
 * for the audit log's actor filter.
 */
export function useUserOptions({ role, status } = {}) {
  const params = { role, status, page: 1, limit: OPTIONS_PAGE_LIMIT };
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'options', params],
    queryFn: () => getUsers(params),
    select: selectUserOptions,
    staleTime: OPTIONS_STALE_MS,
  });
}
