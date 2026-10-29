import { useQuery } from '@tanstack/react-query';
import { verifyCertificate } from '@/services/certificateService';
import { queryKeys } from '@/services/queryKeys';
import { normalizeCertificateNo } from '../schemas/verifyValidation';

/**
 * Public certificate verification (SN12): GET /certificates/:certificateNo/verify ->
 * { certificateNo, status, designation, domain, durationMonths, issuedAt, revokedAt } · 404.
 * Never returns personal data. 4xx responses are not retried (queryClient default).
 */
export function useVerifyCertificate(certificateNo, options = {}) {
  const number = normalizeCertificateNo(certificateNo);
  return useQuery({
    queryKey: queryKeys.certificates.verify(number),
    queryFn: () => verifyCertificate(number),
    enabled: Boolean(number),
    staleTime: 60 * 1000,
    ...options,
  });
}

export default useVerifyCertificate;
