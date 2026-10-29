import { Link } from 'react-router-dom';
import {
  Button,
  CopyButton,
  DescriptionList,
  Drawer,
  ErrorState,
  StatusBadge,
  StatusBanner,
} from '@/shared/components/ui';
import { ArrowRight } from '@/shared/icons';
import { formatDateTime, formatMoney, humanize } from '@/shared/utils/helpers';
import { useAdminPayment } from '../hooks/useAdminPayments';
import { adminLinks, planLabel } from '../utils/format';
import { DetailSection, DetailSkeleton } from './DetailSection';
import { PaymentEventsTimeline } from './PaymentEventsTimeline';
import { PersonCell } from './PersonCell';

function MonoValue({ value, copyLabel }) {
  if (!value) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span className="break-all font-mono text-xs">{value}</span>
      <CopyButton value={value} iconOnly label={copyLabel} variant="ghost" />
    </span>
  );
}

function PaymentDetails({ payment }) {
  const enrollment = payment.enrollment;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>
        <StatusBadge status={payment.status} size="md" />
      </div>

      {payment.flagged ? (
        <StatusBanner variant="warning" title="Flagged for review">
          <span className="block">{payment.flagReason || 'No reason was recorded.'}</span>
          <span className="mt-1 block">Confirm the payment with the gateway before you act on it.</span>
        </StatusBanner>
      ) : null}

      <DetailSection title="Details">
        <DescriptionList
          items={[
            { label: 'Order ID', value: <MonoValue value={payment.orderId} copyLabel="Copy order ID" />, span: 2 },
            {
              label: 'Gateway reference',
              value: <MonoValue value={payment.gatewayReference} copyLabel="Copy gateway reference" />,
              span: 2,
            },
            { label: 'Student', value: <PersonCell person={payment.user} avatarSize="xs" />, span: 2 },
            { label: 'Provider', value: payment.provider ? humanize(payment.provider) : null },
            { label: 'Currency', value: payment.currency },
            { label: 'Created', value: formatDateTime(payment.createdAt) },
            { label: 'Last updated', value: payment.updatedAt ? formatDateTime(payment.updatedAt) : null },
          ]}
        />
      </DetailSection>

      <DetailSection
        title="Enrollment"
        action={
          enrollment?._id ? (
            <Button
              as={Link}
              to={adminLinks.enrollment(enrollment._id)}
              variant="outline"
              size="sm"
              rightIcon={ArrowRight}
            >
              Open enrollment
            </Button>
          ) : null
        }
      >
        {enrollment ? (
          <DescriptionList
            items={[
              { label: 'Plan', value: enrollment.plan ? planLabel(enrollment.plan) : null, span: 2 },
              {
                label: 'Enrollment status',
                value: enrollment.status ? <StatusBadge status={enrollment.status} /> : null,
              },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-500">This payment is not linked to an enrollment.</p>
        )}
      </DetailSection>

      <DetailSection title="Gateway events" description="What the payment gateway reported, oldest first.">
        <PaymentEventsTimeline events={payment.events} />
      </DetailSection>
    </div>
  );
}

/** KD8 payment detail drawer: details, gateway event timeline and a link to the enrollment. */
export function PaymentDrawer({ paymentId, onClose }) {
  const query = useAdminPayment(paymentId);
  const payment = paymentId ? query.data : undefined;

  let body = null;
  if (paymentId) {
    if (query.isPending) body = <DetailSkeleton label="Loading payment…" />;
    else if (query.isError) {
      body = (
        <ErrorState
          error={query.error}
          title="We couldn't load this payment"
          onRetry={() => query.refetch()}
        />
      );
    } else if (payment) body = <PaymentDetails payment={payment} />;
  }

  return (
    <Drawer
      open={Boolean(paymentId)}
      onClose={onClose}
      size="lg"
      title="Payment details"
      description={payment?.orderId ? `Order ${payment.orderId}` : undefined}
    >
      {body}
    </Drawer>
  );
}

export default PaymentDrawer;
