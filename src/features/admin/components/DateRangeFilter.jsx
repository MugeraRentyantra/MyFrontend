import { useId } from 'react';
import { Input } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/**
 * From / to date filter for DataTable toolbars. Values are 'YYYY-MM-DD' strings ('' = open-ended), sent
 * to the API as `from` / `to` (both inclusive). `onChange({ from, to })` receives both values.
 * Stacks into two rows on phones, one row from sm.
 */
export function DateRangeFilter({ from = '', to = '', onChange, label = 'Date', className }) {
  const baseId = useId();
  const fromId = `${baseId}-from`;
  const toId = `${baseId}-to`;
  const isReversed = Boolean(from && to && from > to);

  return (
    <div
      role="group"
      aria-label={`${label} range`}
      className={cn(
        'grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:w-auto',
        className,
      )}
    >
      <label htmlFor={fromId} className="text-sm text-slate-500">
        From
      </label>
      <Input
        id={fromId}
        type="date"
        value={from}
        max={to || undefined}
        onChange={(event) => onChange({ from: event.target.value, to })}
        error={isReversed || undefined}
        className="sm:w-40"
      />
      <label htmlFor={toId} className="text-sm text-slate-500">
        To
      </label>
      <Input
        id={toId}
        type="date"
        value={to}
        min={from || undefined}
        onChange={(event) => onChange({ from, to: event.target.value })}
        error={isReversed || undefined}
        className="sm:w-40"
      />
      {isReversed ? (
        <p role="alert" className="col-span-2 text-xs text-rose-600 sm:sr-only">
          The start date is after the end date.
        </p>
      ) : null}
    </div>
  );
}

export default DateRangeFilter;
