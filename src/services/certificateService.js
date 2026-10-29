import { api } from './api';

/** Certificates (SD13, SD14). Verification is public and returns minimal data only. */
export const getMyCertificates = () => api.get('/certificates/mine');

/** -> { url, expiresAt } short-lived signed URL (owner only) */
export const getCertificateDownload = (id) =>
  api.get(`/certificates/${encodeURIComponent(id)}/download`);

export const verifyCertificate = (certificateNo) =>
  api.get(`/certificates/${encodeURIComponent(String(certificateNo).trim())}/verify`);
