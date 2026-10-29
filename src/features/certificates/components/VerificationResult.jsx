import { useId } from 'react';
import {
  Card,
  DescriptionList,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@/shared/components/ui';
import { BadgeCheck, FileWarning, HelpCircle, ShieldAlert, ShieldCheck } from '@/shared/icons';
import { APP_NAME, CERTIFICATE_STATUS, SUPPORT_EMAIL } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { getErrorStatus } from '@/shared/utils/errors';
import { formatDate, formatDuration } from '@/shared/utils/helpers';

const TONES = {
  valid: {
    icon: BadgeCheck,
    border: 'border-emerald-200',
    band: 'bg-emerald-50',
    chip: 'bg-emerald-100 text-emerald-700',
    title: 'text-emerald-900',
    body: 'text-emerald-800',
  },
  revoked: {
    icon: ShieldAlert,
    border: 'border-rose-200',
    band: 'bg-rose-50',
    chip: 'bg-rose-100 text-rose-700',
    title: 'text-rose-900',
    body: 'text-rose-800',
  },
  unknown: {
    icon: HelpCircle,
    border: 'border-slate-200',
    band: 'bg-slate-50',
    chip: 'bg-slate-200 text-slate-700',
    title: 'text-slate-900',
    body: 'text-slate-700',
  },
};

/**
 * The verify endpoint sends designation/domain as plain names (minimal public payload); accept
 * a `{ name }` ref too so either API shape renders.
 */
function refName(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return typeof value.name === 'string' ? value.name : null;
}

/** One-line outcome for screen-reader announcements (used by the page's live region). */
export function getVerificationAnnouncement(query) {
  if (!query) return '';
  if (query.isLoading) return 'Checking the certificate…';
  if (query.isError) {
    return getErrorStatus(query.error) === 404
      ? 'No certificate matches this number.'
      : "We couldn't check this certificate.";
  }
  if (query.data?.status === CERTIFICATE_STATUS.ISSUED) return 'This certificate is valid.';
  if (query.data?.status === CERTIFICATE_STATUS.REVOKED) {
    return 'This certificate has been revoked.';
  }
  return '';
}

function CheckingCard({ className }) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6', className)}
      aria-busy="true"
    >
      <span className="sr-only">Checking the certificate…</span>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFoundCard({ certificateNo, className }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center shadow-card sm:px-8',
        className,
      )}
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <FileWarning className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 id={headingId} className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
        No certificate found
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
        No certificate matches this number. Check it and try again.
      </p>
      {certificateNo ? (
        <p className="mt-4 inline-flex max-w-full rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-700">
          <span className="sr-only">You searched for </span>
          <span className="break-all">{certificateNo}</span>
        </p>
      ) : null}
    </section>
  );
}

/**
 * Public verification outcome (SN12): valid, revoked or not found. Shows only the minimal
 * record (number, status, designation, domain, duration, dates) — never the holder's name/email.
 */
export function VerificationResult({ certificateNo, query, className }) {
  const headingId = useId();

  if (!query || query.isLoading) return <CheckingCard className={className} />;

  if (query.isError) {
    if (getErrorStatus(query.error) === 404) {
      return <NotFoundCard certificateNo={certificateNo} className={className} />;
    }
    return (
      <Card className={className}>
        <ErrorState
          compact
          title="We couldn't check this certificate"
          error={query.error}
          onRetry={() => query.refetch()}
        />
      </Card>
    );
  }

  const result = query.data;
  if (!result) return <NotFoundCard certificateNo={certificateNo} className={className} />;

  const isValid = result.status === CERTIFICATE_STATUS.ISSUED;
  const isRevoked = result.status === CERTIFICATE_STATUS.REVOKED;
  const tone = TONES[isValid ? 'valid' : isRevoked ? 'revoked' : 'unknown'];
  const Icon = tone.icon;
  const number = result.certificateNo || certificateNo;

  let title = "We couldn't confirm this certificate";
  let subtitle = `Its status could not be confirmed. Contact ${SUPPORT_EMAIL} for help.`;
  if (isValid) {
    title = 'This certificate is valid';
    subtitle = `Issued by ${APP_NAME} on ${formatDate(result.issuedAt)}. The details below match our records.`;
  } else if (isRevoked) {
    title = 'This certificate has been revoked';
    subtitle = result.revokedAt
      ? `It was revoked on ${formatDate(result.revokedAt)} and is no longer valid.`
      : 'It is no longer valid.';
  }

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'animate-fade-in overflow-hidden rounded-2xl border bg-white shadow-card',
        tone.border,
        className,
      )}
    >
      <div className={cn('flex items-start gap-4 px-5 py-5 sm:px-6', tone.band)}>
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            tone.chip,
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className={cn('text-lg font-semibold tracking-tight', tone.title)}>
            {title}
          </h2>
          <p className={cn('mt-1 text-sm', tone.body)}>{subtitle}</p>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <DescriptionList
          items={[
            {
              label: 'Certificate number',
              value: <span className="break-all font-mono">{number}</span>,
            },
            { label: 'Status', value: <StatusBadge status={result.status} /> },
            { label: 'Designation', value: refName(result.designation) },
            { label: 'Domain', value: refName(result.domain) },
            {
              label: 'Duration',
              value: result.durationMonths ? formatDuration(result.durationMonths) : null,
            },
            { label: 'Issued on', value: formatDate(result.issuedAt) },
            isRevoked && { label: 'Revoked on', value: formatDate(result.revokedAt) },
          ]}
        />
      </div>

      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Checked against {APP_NAME} records. For privacy, verification never shows the
          holder&apos;s personal details.
        </span>
      </div>
    </section>
  );
}

export default VerificationResult;
