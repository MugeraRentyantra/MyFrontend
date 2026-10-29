import { CERTIFICATE_STATUS, ROLES } from '@/shared/constants';
import { db } from '../db';
import { createCertificatePdfDataUrl } from '../pdf';
import { addMinutes } from '../seed/helpers';
import { certificateDto, certificateVerificationDto } from '../services';
import { applySort, forbidden, json, mock, notFound, paginate, requireAuth } from '../utils';

/**
 * Certificates (SD13, SD14, SD15) for the mock API.
 *  - GET /certificates/mine                      student's own certificates (issued and revoked)
 *  - GET /certificates/:id/download              owner only -> short-lived "signed" PDF URL
 *  - GET /certificates/:certificateNo/verify     public, minimal data, 404 when unknown
 */

const DOWNLOAD_TTL_MINUTES = 5;

function decodeParam(value) {
  try {
    return decodeURIComponent(String(value ?? ''));
  } catch {
    return String(value ?? '');
  }
}

function normalizeNumber(value) {
  return decodeParam(value).trim().replace(/\s+/g, '').toUpperCase();
}

export const certificateHandlers = [
  // Static path first.
  mock.get('/certificates/mine', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;

    const mine = db.certificates.filter((certificate) => certificate.userId === auth.user._id);
    const sorted = applySort(mine, request, 'issuedAt:desc');
    return json(paginate(sorted.map(certificateDto), request, 50));
  }),

  mock.get('/certificates/:id/download', ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const id = decodeParam(params.id);
    const certificate = db.certificates.find((item) => item._id === id);
    if (!certificate) return notFound('Certificate');
    if (certificate.userId !== auth.user._id) return forbidden();
    if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      return forbidden('This certificate has been revoked and can no longer be downloaded.');
    }

    const dto = certificateDto(certificate);
    const url = createCertificatePdfDataUrl({
      certificateNo: dto.certificateNo,
      studentName: dto.studentName,
      designation: dto.designation?.name,
      domain: dto.domain?.name,
      durationMonths: dto.durationMonths,
      issuedAt: dto.issuedAt,
      verifyUrl: dto.verifyUrl,
    });
    return json({ url, expiresAt: addMinutes(new Date().toISOString(), DOWNLOAD_TTL_MINUTES) });
  }),

  // Public: no auth. Returns only { certificateNo, status, designation, domain, durationMonths,
  // issuedAt, revokedAt } — never the holder's name or email.
  mock.get('/certificates/:certificateNo/verify', ({ params }) => {
    const number = normalizeNumber(params.certificateNo);
    if (!number) return notFound('Certificate');
    const certificate = db.certificates.find(
      (item) => String(item.certificateNo || '').toUpperCase() === number,
    );
    if (!certificate) return notFound('Certificate');
    return json(certificateVerificationDto(certificate));
  }),
];

export default certificateHandlers;
