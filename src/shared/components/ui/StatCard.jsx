import { Link } from 'react-router-dom';
import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

// Tone only tints the icon chip; the value and label always use text colours.
const TONES = {
  default: 'bg-slate-100 text-slate-600',
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
};

const DIRECTION_TEXT = { up: 'Up', down: 'Down', flat: 'No change' };

function StatDelta({ delta }) {
  const config = delta && typeof delta === 'object' ? delta : { value: delta };
  const direction = ['up', 'down'].includes(config.direction) ? config.direction : 'flat';
  const positiveIsGood = config.positiveIsGood ?? true;
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  let tone = 'text-slate-500';
  if (direction !== 'flat') {
    const isGood = (direction === 'up') === positiveIsGood;
    tone = isGood ? 'text-emerald-700' : 'text-rose-700';
  }

  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
      <span className={cn('inline-flex items-center gap-1 font-medium', tone)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{DIRECTION_TEXT[direction]}</span>
        {config.value}
      </span>
      {config.label ? <span className="text-slate-500">{config.label}</span> : null}
    </p>
  );
}

function IconChip({ icon: Icon, tone }) {
  return (
    <span
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        TONES[tone] ?? TONES.default,
      )}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

/**
 * KPI tile: label, a big already-formatted value (proportional figures), optional hint and delta.
 * delta = { value: '+12%', direction: 'up'|'down'|'flat', positiveIsGood = true, label: 'vs last month' }.
 * `to` turns the whole tile into a router Link.
 */
export function StatCard({
  label,
  value,
  icon,
  hint,
  delta,
  loading = false,
  to,
  tone = 'default',
  className,
  ...rest
}) {
  const isLink = Boolean(to) && !loading;
  const Root = isLink ? Link : 'div';
  const linkProps = isLink ? { to } : {};

  return (
    <Root
      {...linkProps}
      className={cn(
        'group relative block min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-card',
        isLink &&
          'transition duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        className,
      )}
      aria-busy={loading || undefined}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-slate-500">
          {label}
          {isLink ? (
            <ArrowUpRight
              className="ml-1 inline-block h-3.5 w-3.5 align-[-2px] text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          ) : null}
        </p>
        {icon ? <IconChip icon={icon} tone={tone} /> : null}
      </div>

      {loading ? (
        <>
          <div className="mt-2 h-8 w-24 animate-pulse rounded-md bg-slate-200 sm:h-9" aria-hidden="true" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100" aria-hidden="true" />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        <>
          <div className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {value ?? '—'}
          </div>
          {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
          {delta ? <StatDelta delta={delta} /> : null}
        </>
      )}
    </Root>
  );
}

export default StatCard;
