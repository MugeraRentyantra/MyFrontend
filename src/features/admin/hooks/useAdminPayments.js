import { useQuery } from '@tanstack/react-query';
import { getAdminPayment, getAdminPayments } from '@/services/adminService';
import { queryKeys } from '@/services/queryKeys';

/** DataTable fetcher for /admin/payments (KD8): params = { page, limit, search, sort, status, flagged, from, to }. */
export const fetchAdminPayments = (params) => getAdminPayments(params);

/** One payment with its gateway `events[]` (PaymentDrawer). */
export function useAdminPayment(id) {
  return useQuery({
    queryKey: queryKeys.admin.payment(id),
    queryFn: () => getAdminPayment(id),
    enabled: Boolean(id),
  });
}
