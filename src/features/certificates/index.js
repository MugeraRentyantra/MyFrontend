/**
 * Certificates feature (GP12, SN12, SD13, SD14). Pages are lazy-loaded by the router
 * (src/routes/lazyPages.js) and are intentionally not re-exported here.
 */
export { CertificateCard, getVerificationLink } from './components/CertificateCard';
export { CertificatePreview } from './components/CertificatePreview';
export { EligibilityChecklist } from './components/EligibilityChecklist';
export { VerificationResult, getVerificationAnnouncement } from './components/VerificationResult';
export { VerifyForm } from './components/VerifyForm';
export { useCertificateDownload } from './hooks/useCertificateDownload';
export {
  ELIGIBILITY_STATE,
  buildEligibility,
  useCertificateEligibility,
} from './hooks/useCertificateEligibility';
export { useDemoCertificateNumbers } from './hooks/useDemoCertificateNumbers';
export { findCertificateForEnrollment, useMyCertificates } from './hooks/useMyCertificates';
export { useVerifyCertificate } from './hooks/useVerifyCertificate';
export {
  CERTIFICATE_NO_EXAMPLE,
  normalizeCertificateNo,
  verifySchema,
} from './schemas/verifyValidation';
