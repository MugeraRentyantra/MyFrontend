import { useQuery } from '@tanstack/react-query';
import { getMyCertificates } from '@/services/certificateService';
import { queryKeys } from '@/services/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import { CERTIFICATE_STATUS, ROLES } from '@/shared/constants';

function toList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

function selectNewestFirst(data) {
  return [...toList(data)].sort(
    (a, b) => new Date(b?.issuedAt ?? 0).getTime() - new Date(a?.issuedAt ?? 0).getTime(),
  );
}

/** The current student's certificates (array), newest first. */
export function useMyCertificates(options = {}) {
  const { isAuthenticated, hasRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.certificates.mine,
    queryFn: () => getMyCertificates(),
    select: selectNewestFirst,
    enabled: isAuthenticated && hasRole(ROLES.STUDENT),
    ...options,
  });
}

/**
 * The certificate that belongs to an enrollment: matched by certificate.enrollmentId (or the
 * enrollment's certificateId). An issued certificate wins over a revoked one.
 */
export function findCertificateForEnrollment(certificates, enrollment) {
  if (!enrollment || !Array.isArray(certificates)) return null;
  const matches = certificates.filter(
    (certificate) =>
      certificate &&
      (certificate.enrollmentId === enrollment._id ||
        (enrollment.certificateId && certificate._id === enrollment.certificateId)),
  );
  if (matches.length === 0) return null;
  return (
    matches.find((certificate) => certificate.status === CERTIFICATE_STATUS.ISSUED) ?? matches[0]
  );
}

export default useMyCertificates;
