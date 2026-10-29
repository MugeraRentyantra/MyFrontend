import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, PageHeader } from '@/shared/components/ui';
import { Info, ShieldCheck, Sparkles } from '@/shared/icons';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ROUTES, paths } from '@/shared/constants';
import { VerificationResult, getVerificationAnnouncement } from '../components/VerificationResult';
import { VerifyForm } from '../components/VerifyForm';
import { useDemoCertificateNumbers } from '../hooks/useDemoCertificateNumbers';
import { useVerifyCertificate } from '../hooks/useVerifyCertificate';
import { normalizeCertificateNo } from '../schemas/verifyValidation';

function DemoSamples({ samples }) {
  if (!samples) return null;
  const entries = [
    samples.valid && { number: samples.valid, label: 'valid' },
    samples.revoked && { number: samples.revoked, label: 'revoked' },
  ].filter(Boolean);
  if (entries.length === 0) return null;

  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Demo mode — try a sample:
      </p>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.number}>
            <Button
              as={Link}
              to={paths.verifyCertificate(entry.number)}
              variant="outline"
              size="sm"
              className="h-10 font-mono sm:h-8"
            >
              {entry.number}
              <span className="font-sans text-slate-500">· {entry.label}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
      <p>
        The certificate number is printed at the bottom of every certificate. Verification shows
        the designation, domain, duration and issue date — never the holder&apos;s personal
        details.
      </p>
    </div>
  );
}

/**
 * Public certificate verification (SN12): /verify and /verify/:number.
 * Anyone can check a number; the result never includes personal data.
 */
export default function VerifyCertificatePage() {
  const { number: rawNumber } = useParams();
  const navigate = useNavigate();
  const certificateNo = normalizeCertificateNo(rawNumber);
  useDocumentTitle(certificateNo ? `Verify ${certificateNo}` : 'Verify a certificate');

  const query = useVerifyCertificate(certificateNo);
  const samples = useDemoCertificateNumbers();

  // Canonical URL: /verify/ip-2026-000123 -> /verify/IP-2026-000123
  useEffect(() => {
    if (rawNumber === undefined || rawNumber === certificateNo) return;
    navigate(certificateNo ? paths.verifyCertificate(certificateNo) : ROUTES.VERIFY_CERTIFICATE, {
      replace: true,
    });
  }, [rawNumber, certificateNo, navigate]);

  const handleVerify = (value) => {
    if (!value) return;
    if (value === certificateNo) {
      query.refetch();
      return;
    }
    navigate(paths.verifyCertificate(value));
  };

  const announcement = certificateNo ? getVerificationAnnouncement(query) : '';

  return (
    <div className="relative isolate">
      <div
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-brand-50 via-white to-white"
        aria-hidden="true"
      />
      <div
        className="bg-grid absolute inset-x-0 top-0 -z-10 h-80 [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden="true"
      />

      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader
            eyebrow="Certificate verification"
            title="Verify a certificate"
            description="Check that an internship certificate is genuine. Enter the number printed on it."
          />

          <Card padding="lg">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-slate-600">
                Results come straight from our records and update immediately if a certificate is
                revoked.
              </p>
            </div>
            <VerifyForm
              defaultValue={certificateNo}
              onVerify={handleVerify}
              loading={Boolean(certificateNo) && query.isFetching}
            />
            <DemoSamples samples={samples} />
          </Card>

          <p className="sr-only" role="status">
            {announcement}
          </p>

          {certificateNo ? (
            <VerificationResult certificateNo={certificateNo} query={query} />
          ) : (
            <HowItWorks />
          )}
        </div>
      </div>
    </div>
  );
}
