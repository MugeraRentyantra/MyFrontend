import { useMemo } from 'react';
import { Timeline } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { toPaymentTimelineItems } from '../utils/format';

/**
 * Gateway events of one payment, oldest first (order.created → payment.authorized → payment.captured /
 * payment.failed → refunds). Each event shows its note and the gateway's event id.
 */
export function PaymentEventsTimeline({ events, className }) {
  const items = useMemo(
    () =>
      toPaymentTimelineItems(events).map((item) => ({
        id: item.id,
        title: item.title,
        icon: item.icon,
        variant: item.variant,
        time: item.time,
        description:
          item.note || item.eventId ? (
            <>
              {item.note ? <span className="block">{item.note}</span> : null}
              {item.eventId ? (
                <span className="mt-0.5 block font-mono text-xs text-slate-500">{item.eventId}</span>
              ) : null}
            </>
          ) : null,
      })),
    [events],
  );

  if (items.length === 0) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>
        No gateway events recorded for this payment yet.
      </p>
    );
  }

  return <Timeline items={items} className={className} />;
}

export default PaymentEventsTimeline;
