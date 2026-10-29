import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  SkeletonText,
  StatusBadge,
} from '@/shared/components/ui';
import { ArrowRight, Award, BadgeCheck, Hourglass, ListChecks } from '@/shared/icons';
import {
  CERTIFICATE_STATUS,
  ENROLLMENT_STATUS,
  ROUTES,
  SUPPORT_EMAIL,
} from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatDate, pluralize } from '@/shared/utils/helpers';

/**
 * Certificate status for the active enrollment: the issued certificate number with a link,
 * a revoked notice, or what is left before the student becomes eligible (every task approved).
 * Eligibility itself is decided by the server; this only summarises progress.
 */
export function CertificateStatusCard({
  enrollment,
  certificate,
  approved = 0,
  total = 0,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  className,
}) {
  let content;
  let footerLabel = 'About certificates';

  if (isLoading) {
    content = <SkeletonText lines={3} />;
  } else if (isError) {
    content = (
      <ErrorState
        compact
        error={error}
        title="We couldn't load your certificate"
        onRetry={onRetry}
      />
    );
  } else if (certificate?.status === CERTIFICATE_STATUS.ISSUED) {
    footerLabel = 'View certificate';
    content = (
      <div>
        <Badge variant="success" icon={BadgeCheck}>
          Issued
        </Badge>
        <p className="mt-3 text-xs font-medium text-slate-500">Certificate number</p>
        <p className="mt-0.5 break-all font-mono text-sm font-semibold text-slate-900">
          {certificate.certificateNo}
        </p>
        {certificate.issuedAt ? (
          <p className="mt-2 text-sm text-slate-500">
            Issued <time dateTime={certificate.issuedAt}>{formatDate(certificate.issuedAt)}</time>
          </p>
        ) : null}
      </div>
    );
  } else if (certificate?.status === CERTIFICATE_STATUS.REVOKED) {
    content = (
      <div>
        <StatusBadge status={CERTIFICATE_STATUS.REVOKED} />
        <p className="mt-3 text-sm text-slate-600">
          This certificate was revoked
          {certificate.revokeReason ? `: ${certificate.revokeReason}` : '.'} If you think this is a
          mistake, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    );
  } else if (enrollment?.status === ENROLLMENT_STATUS.COMPLETED || (total > 0 && approved >= total)) {
    content = (
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
          aria-hidden="true"
        >
          <Hourglass className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Your certificate is on its way</p>
          <p className="mt-1 text-sm text-slate-600">
            Every task is approved. We'll email your certificate as soon as it's issued.
          </p>
        </div>
      </div>
    );
  } else {
    const remaining = Math.max(total - approved, 0);
    content = (
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          aria-hidden="true"
        >
          <ListChecks className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">Not issued yet</p>
          <p className="mt-1 text-sm text-slate-600">
            {total > 1
              ? `You become eligible once all ${total} tasks are approved. ${pluralize(remaining, 'task')} to go.`
              : 'You become eligible once every task in your schedule is approved.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader title="Certificate" icon={Award} />
      <CardBody className="flex-1">{content}</CardBody>
      <CardFooter>
        <Button
          as={Link}
          to={ROUTES.CERTIFICATE}
          variant="ghost"
          size="sm"
          rightIcon={ArrowRight}
          className="h-10 sm:h-8"
        >
          {footerLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default CertificateStatusCard;
