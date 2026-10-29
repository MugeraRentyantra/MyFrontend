import { Link } from 'react-router-dom';
import {
  Button,
  CopyButton,
  DescriptionList,
  Drawer,
  EmptyState,
  ErrorState,
  ProgressBar,
  StatusBadge,
  StatusBanner,
} from '@/shared/components/ui';
import { ArrowRight, CreditCard } from '@/shared/icons';
import { ENROLLMENT_TYPE, ROUTES } from '@/shared/constants';
import { formatDateTime, formatMoney, formatPercent, humanize, pluralize } from '@/shared/utils/helpers';
import { useAdminEnrollment } from '../hooks/useAdminEnrollments';
import { adminLinks, personName, planMeta, planTitle } from '../utils/format';
import { DetailSection, DetailSkeleton } from './DetailSection';
import { PaymentEventsTimeline } from './PaymentEventsTimeline';
import { PersonCell } from './PersonCell';

function LabelledStatus({ label, status, emptyLabel }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      {label}
      {status ? <StatusBadge status={status} /> : <span className="text-slate-700">{emptyLabel}</span>}
    </span>
  );
}

/** Base price, discount % and payable amount exactly as snapshotted by the server (never recomputed). */
function PriceSnapshot({ snapshot }) {
  const currency = snapshot?.currency;
  const cells = [
    { label: 'Base price', value: formatMoney(snapshot?.basePrice, currency) },
    {
      label: 'Discount',
      value:
        snapshot?.discountPercent === null || snapshot?.discountPercent === undefined
          ? '—'
          : formatPercent(snapshot.discountPercent),
    },
    { label: 'Payable', value: formatMoney(snapshot?.payableAmount, currency), strong: true },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      {cells.map((cell) => (
        <div key={cell.label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{cell.label}</dt>
          <dd
            className={
              cell.strong
                ? 'mt-1 text-lg font-semibold text-slate-900'
                : 'mt-1 text-lg font-medium text-slate-700'
            }
          >
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PaymentAttempt({ payment }) {
  return (
    <article className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs text-slate-900">{payment.orderId || 'No order id'}</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="tabular font-semibold text-slate-900">
              {formatMoney(payment.amount, payment.currency)}
            </span>
            {payment.provider ? ` · ${humanize(payment.provider)}` : ''} · {formatDateTime(payment.createdAt)}
          </p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {payment.flagged ? (
        <StatusBanner variant="warning" title="Flagged for review" className="mt-3">
          {payment.flagReason || 'No reason was recorded.'}
        </StatusBanner>
      ) : null}

      <div className="mt-4">
        <PaymentEventsTimeline events={payment.events} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          as={Link}
          to={adminLinks.payment(payment._id)}
          variant="ghost"
          size="sm"
          rightIcon={ArrowRight}
        >
          Open payment
        </Button>
      </div>
    </article>
  );
}

function EnrollmentDetails({ enrollment }) {
  const progress = enrollment.progress ?? {};
  const total = Math.max(0, Number(progress.total) || 0);
  const approved = Math.max(0, Number(progress.approved) || 0);
  const isTeam = enrollment.enrollmentType === ENROLLMENT_TYPE.TEAM;
  const payments = [...(Array.isArray(enrollment.payments) ? enrollment.payments : [])].sort(
    (a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime(),
  );
  const meta = planMeta(enrollment.plan);

  const overview = [
    { label: 'Student', value: <PersonCell person={enrollment.student} avatarSize="xs" />, span: 2 },
    {
      label: 'Plan',
      value: (
        <>
          <span className="block font-medium">{planTitle(enrollment.plan)}</span>
          {meta ? <span className="block text-slate-500">{meta}</span> : null}
        </>
      ),
    },
    {
      label: 'Type',
      value: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <StatusBadge status={enrollment.enrollmentType} dot={false} />
          {isTeam && enrollment.team?.name ? <span>{enrollment.team.name}</span> : null}
        </span>
      ),
    },
    {
      label: 'Trainer',
      value: enrollment.trainer ? (
        <PersonCell person={enrollment.trainer} avatarSize="xs" />
      ) : (
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <span className="text-slate-500">Not assigned</span>
          <Link to={ROUTES.ADMIN_ASSIGNMENTS} className="link text-sm">
            Assign a trainer
          </Link>
        </span>
      ),
    },
    {
      label: 'Schedule version',
      value: enrollment.scheduleVersion ? `Version ${enrollment.scheduleVersion}` : 'Assigned on payment',
    },
    {
      label: 'Task progress',
      value:
        total > 0 ? (
          <div className="max-w-xs">
            <p className="mb-1.5">
              {approved} of {pluralize(total, 'task')} approved
            </p>
            <ProgressBar
              value={approved}
              max={total}
              size="sm"
              variant={approved >= total ? 'success' : 'brand'}
              aria-label="Approved tasks"
            />
          </div>
        ) : (
          'Not started'
        ),
    },
    {
      label: 'Terms',
      value: enrollment.termsAcceptedVersion
        ? `Accepted version ${enrollment.termsAcceptedVersion}`
        : 'Not accepted yet',
    },
    { label: 'Certificate', value: enrollment.certificateId ? 'Issued' : 'Not issued' },
    { label: 'Created', value: formatDateTime(enrollment.createdAt) },
    { label: 'Activated', value: enrollment.activatedAt ? formatDateTime(enrollment.activatedAt) : null },
    { label: 'Completed', value: enrollment.completedAt ? formatDateTime(enrollment.completedAt) : null },
    {
      label: 'Enrollment ID',
      value: (
        <span className="inline-flex items-center gap-2">
          <span className="break-all font-mono text-xs">{enrollment._id}</span>
          <CopyButton value={enrollment._id} iconOnly label="Copy enrollment ID" variant="ghost" />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <LabelledStatus label="Enrollment" status={enrollment.status} />
        <LabelledStatus label="Payment" status={enrollment.paymentStatus} emptyLabel="Not started" />
      </div>

      <DetailSection title="Overview">
        <DescriptionList items={overview} />
      </DetailSection>

      <DetailSection
        title="Price snapshot"
        description="Locked when the student enrolled. Later price changes do not affect it."
      >
        <PriceSnapshot snapshot={enrollment.priceSnapshot} />
      </DetailSection>

      <DetailSection
        title="Payments"
        description={
          payments.length
            ? `${pluralize(payments.length, 'payment attempt')}, newest first.`
            : 'Every checkout attempt and what the gateway reported.'
        }
      >
        {payments.length ? (
          <div className="space-y-4">
            {payments.map((payment) => (
              <PaymentAttempt key={payment._id} payment={payment} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            variant="muted"
            icon={CreditCard}
            title="No payment attempts yet"
            description="The student has not started checkout for this enrollment."
          />
        )}
      </DetailSection>
    </div>
  );
}

/** KD8 enrollment detail drawer. `enrollmentId` null = closed. */
export function EnrollmentDrawer({ enrollmentId, onClose }) {
  const query = useAdminEnrollment(enrollmentId);
  const enrollment = enrollmentId ? query.data : undefined;

  let body;
  if (!enrollmentId) body = null;
  else if (query.isPending) body = <DetailSkeleton label="Loading enrollment…" />;
  else if (query.isError) {
    body = (
      <ErrorState
        error={query.error}
        title="We couldn't load this enrollment"
        onRetry={() => query.refetch()}
      />
    );
  } else if (enrollment) body = <EnrollmentDetails enrollment={enrollment} />;

  return (
    <Drawer
      open={Boolean(enrollmentId)}
      onClose={onClose}
      size="lg"
      title="Enrollment details"
      description={
        enrollment ? `${personName(enrollment.student)} · ${planTitle(enrollment.plan)}` : undefined
      }
    >
      {body}
    </Drawer>
  );
}

export default EnrollmentDrawer;
