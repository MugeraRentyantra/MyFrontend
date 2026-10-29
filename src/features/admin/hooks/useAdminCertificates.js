import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminCertificates, resendCertificateEmail } from '@/services/adminService';
import { queryKeys } from '@/services/queryKeys';
import { EMAIL_STATUS } from '@/shared/constants';

/** DataTable fetcher for /admin/certificates (KD12): params = { page, limit, search, sort, emailStatus, status }. */
export const fetchAdminCertificates = (params) => getAdminCertificates(params);

/** True when a loaded certificates page still has an email being sent. */
export function hasPendingEmail(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.some((certificate) => certificate?.emailStatus === EMAIL_STATUS.PENDING);
}

/**
 * POST /admin/certificates/:id/resend — re-queues the certificate email (never issues a new certificate).
 * mutate(certificateId) resolves to { message, emailStatus: 'PENDING' }.
 */
export function useResendCertificateEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (certificateId) => resendCertificateEmail(certificateId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.certificates }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.audit }),
      ]),
  });
}
