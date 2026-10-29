import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CopyButton,
  DescriptionList,
  StatusBadge,
  toast,
} from '@/shared/components/ui';
import { Award, Download, ExternalLink } from '@/shared/icons';
import { CERTIFICATE_STATUS, EMAIL_STATUS, paths } from '@/shared/constants';
import { useAuth } from '@/shared/hooks/useAuth';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { absoluteUrl, formatDate, formatDuration } from '@/shared/utils/helpers';
import { useCertificateDownload } from '../hooks/useCertificateDownload';

/** Public verification URL for a certificate number, e.g. https://…/verify/IP-2026-000123 */
export function getVerificationLink(certificateNo) {
  return certificateNo ? absoluteUrl(paths.verifyCertificate(certificateNo)) : '';
}

const EMAIL_STATUS_COPY = {
  [EMAIL_STATUS.SENT]: {
    label: 'Emailed',
    text: (email) => (email ? `A copy was sent to ${email}.` : 'A copy was emailed to you.'),
  },
  [EMAIL_STATUS.PENDING]: {
    label: 'Sending',
    text: () => "We're emailing you a copy. It can take a few minutes to arrive.",
  },
  [EMAIL_STATUS.FAILED]: {
    label: 'Not delivered',
    text: () => "We couldn't email it; you can download it here.",
  },
};

function EmailDelivery({ status, email }) {
  const copy = EMAIL_STATUS_COPY[status];
  if (!copy) return <span className="text-slate-500">—</span>;
  return (
    <span className="flex flex-col items-start gap-1.5">
      <StatusBadge status={status} label={copy.label} />
      <span className="text-sm text-slate-600">{copy.text(email)}</span>
    </span>
  );
}

/**
 * The student's certificate (GP12): number with copy, issue date, email delivery status,
 * programme details and the actions to download the PDF, copy the verification link and open
 * the public page. A revoked certificate keeps its record but loses download and sharing.
 */
export function CertificateCard({ certificate, className }) {
  const { user } = useAuth();
  const download = useCertificateDownload();
  if (!certificate) return null;

  const number = certificate.certificateNo;
  const revoked = certificate.status === CERTIFICATE_STATUS.REVOKED;
  const designation = certificate.designation?.name;
  const domain = certificate.domain?.name;
  const title = [designation, domain].filter(Boolean).join(' · ') || 'Internship certificate';
  const verifyLink = getVerificationLink(number);

  const handleDownload = () => {
    download.mutate(certificate, {
      onSuccess: () =>
        toast.success('Download started', { description: `${number}.pdf is on its way.` }),
      onError: (error) =>
        toast.error(
          getErrorMessage(error, "We couldn't prepare your download. Please try again."),
        ),
    });
  };

  return (
    <Card padding="none" className={className}>
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              revoked ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600',
            )}
          >
            <Award className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Certificate of completion</p>
            <h2 className="mt-1 break-words text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {certificate.durationMonths ? (
              <p className="mt-0.5 text-sm text-slate-500">
                {formatDuration(certificate.durationMonths)} internship
              </p>
            ) : null}
          </div>
        </div>
        <StatusBadge status={certificate.status} size="md" className="self-start" />
      </div>

      <CardBody>
        <DescriptionList
          items={[
            {
              label: 'Certificate number',
              value: (
                <span className="flex flex-wrap items-center gap-1">
                  <span className="break-all font-mono text-sm font-medium text-slate-900">
                    {number}
                  </span>
                  <CopyButton
                    value={number}
                    iconOnly
                    variant="ghost"
                    label="Copy certificate number"
                    copiedLabel="Certificate number copied"
                  />
                </span>
              ),
            },
            { label: 'Awarded to', value: certificate.studentName },
            { label: 'Issued on', value: formatDate(certificate.issuedAt) },
            revoked
              ? { label: 'Revoked on', value: formatDate(certificate.revokedAt) }
              : {
                  label: 'Email delivery',
                  value: <EmailDelivery status={certificate.emailStatus} email={user?.email} />,
                },
            designation && { label: 'Designation', value: designation },
            domain && { label: 'Domain', value: domain },
          ]}
        />
      </CardBody>

      <CardFooter className="justify-start">
        {!revoked ? (
          <>
            <Button
              leftIcon={Download}
              loading={download.isPending}
              onClick={handleDownload}
              className="w-full sm:w-auto"
            >
              Download PDF
            </Button>
            <CopyButton
              value={verifyLink}
              label="Copy verification link"
              copiedLabel="Link copied"
              size="md"
              className="w-full sm:w-auto"
            />
          </>
        ) : null}
        {number ? (
          <Button
            as={Link}
            to={paths.verifyCertificate(number)}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            rightIcon={ExternalLink}
            className="w-full sm:w-auto"
          >
            Open public page
            <span className="sr-only"> (opens in a new tab)</span>
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default CertificateCard;
