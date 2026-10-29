import { useId, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, StatusBadge } from '@/shared/components/ui';
import { AlertTriangle, ArrowRight, ShieldCheck } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { formatAge, formatMoney, formatRelativeTime, pluralize, truncate } from '@/shared/utils/helpers';
import { ATTENTION_REASONS } from '../constants';
import { adminLinks } from '../utils/format';
import { PersonCell } from './PersonCell';

function ReasonCell({ payment }) {
  if (payment.reason === ATTENTION_REASONS.FLAGGED) {
    return (
      <div className="min-w-0 max-w-[16rem]">
        <Badge variant="warning" icon={AlertTriangle}>
          Flagged
        </Badge>
        {payment.flagReason ? (
          <p className="mt-1 truncate text-xs text-slate-500" title={payment.flagReason}>
            {truncate(payment.flagReason, 60)}
          </p>
        ) : null}
      </div>
    );
  }
  if (payment.reason === ATTENTION_REASONS.PENDING) {
    return (
      <span className="text-sm text-slate-600">
        Pending for <span className="tabular font-medium text-slate-900">{formatAge(payment.createdAt)}</span>
      </span>
    );
  }
  return <span className="text-sm text-slate-600">Failed {formatRelativeTime(payment.updatedAt ?? payment.createdAt)}</span>;
}

/**
 * KD1 payment verification table: flagged, pending and failed payments, most urgent first. Each row
 * opens the payment's detail drawer on /admin/payments. Data comes from useAdminDashboard().attention.
 */
export function VerificationTable({ items, totals, isLoading, error, onRetry, className }) {
  const headingId = useId();
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        key: 'orderId',
        header: 'Order',
        cell: (payment) => (
          <span className="font-mono text-xs text-slate-900">{payment.orderId || '—'}</span>
        ),
      },
      {
        key: 'user',
        header: 'Student',
        cell: (payment) => <PersonCell person={payment.user} showAvatar={false} />,
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        cell: (payment) => (
          <span className="tabular font-medium text-slate-900">
            {formatMoney(payment.amount, payment.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (payment) => <StatusBadge status={payment.status} />,
      },
      {
        key: 'reason',
        header: 'Why it is here',
        cell: (payment) => <ReasonCell payment={payment} />,
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (payment) => (
          <Button
            as={Link}
            to={adminLinks.payment(payment._id)}
            variant="outline"
            size="sm"
            aria-label={`Review payment ${payment.orderId || ''}`.trim()}
          >
            Review
          </Button>
        ),
      },
    ],
    [],
  );

  const summaryParts = [];
  if (totals?.flagged) summaryParts.push(`${totals.flagged} flagged`);
  if (totals?.pending) summaryParts.push(`${totals.pending} pending`);
  if (totals?.failed) summaryParts.push(`${totals.failed} failed`);
  const shown = Array.isArray(items) ? items.length : 0;

  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold text-slate-900">
            Payments to verify
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {summaryParts.length
              ? `${summaryParts.join(' · ')}. Showing the ${pluralize(shown, 'most urgent payment')}.`
              : 'Flagged, pending and failed payments show up here, most urgent first.'}
          </p>
        </div>
        <Button as={Link} to={ROUTES.ADMIN_PAYMENTS} variant="ghost" size="sm" rightIcon={ArrowRight}>
          All payments
        </Button>
      </div>

      <DataTable
        data={items}
        loading={isLoading}
        error={error}
        onRetry={onRetry}
        columns={columns}
        searchable={false}
        pageSize={8}
        onRowClick={(payment) => navigate(adminLinks.payment(payment._id))}
        caption="Payments that need verification"
        emptyState={{
          icon: ShieldCheck,
          title: 'Nothing to verify',
          description: 'There are no flagged, pending or failed payments right now.',
        }}
      />
    </section>
  );
}

export default VerificationTable;
