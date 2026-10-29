import { Circle } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDateTime } from '@/shared/utils/helpers';

const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-500',
  brand: 'bg-brand-100 text-brand-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function TimelineTime({ time }) {
  if (time === undefined || time === null || time === '') return null;
  const className = 'shrink-0 whitespace-nowrap text-xs text-slate-500';
  if (typeof time === 'string' && ISO_DATE.test(time)) {
    return (
      <time dateTime={time} className={className}>
        {formatDateTime(time)}
      </time>
    );
  }
  if (time instanceof Date) {
    if (Number.isNaN(time.getTime())) return null;
    return (
      <time dateTime={time.toISOString()} className={className}>
        {formatDateTime(time)}
      </time>
    );
  }
  return <span className={className}>{time}</span>;
}

/**
 * Vertical activity timeline: items = [{ id, title, description, time (ISO string or node), icon, variant }].
 * variant: neutral | brand | success | warning | danger (tints the icon chip).
 */
export function Timeline({ items = [], className, ...rest }) {
  return (
    <ol className={cn('relative', className)} {...rest}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const Icon = item.icon ?? Circle;
        return (
          <li key={item.id ?? index} className={cn('relative flex gap-3', !isLast && 'pb-6')}>
            {!isLast ? (
              <span className="absolute bottom-0 left-4 top-8 -ml-px w-0.5 bg-slate-200" aria-hidden="true" />
            ) : null}
            <span
              className={cn(
                'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
                VARIANTS[item.variant] ?? VARIANTS.neutral,
              )}
              aria-hidden="true"
            >
              <Icon className={item.icon ? 'h-4 w-4' : 'h-2.5 w-2.5 fill-current'} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <div className="min-w-0 text-sm font-medium text-slate-900">{item.title}</div>
                <TimelineTime time={item.time} />
              </div>
              {item.description ? (
                <div className="mt-0.5 break-words text-sm text-slate-500">{item.description}</div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default Timeline;
