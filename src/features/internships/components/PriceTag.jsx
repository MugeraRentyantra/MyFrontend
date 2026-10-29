import { CURRENCY } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatMoney } from '@/shared/utils/helpers';

const AMOUNT_SIZES = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

/**
 * Displays a server price (integer paise) — formatting only, never arithmetic.
 * `prefix` renders above the amount (e.g. "From"), `note` below it (e.g. the merit-discount hint).
 */
export function PriceTag({
  amount,
  currency = CURRENCY,
  prefix,
  note,
  size = 'md',
  align = 'left',
  emptyLabel = 'Pricing coming soon',
  className,
  ...rest
}) {
  const hasAmount = amount !== null && amount !== undefined && Number.isFinite(Number(amount));

  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right', className)} {...rest}>
      {prefix && hasAmount ? <p className="text-xs font-medium text-slate-500">{prefix}</p> : null}
      {hasAmount ? (
        <p
          className={cn(
            'font-semibold tracking-tight text-slate-900',
            AMOUNT_SIZES[size] ?? AMOUNT_SIZES.md,
          )}
        >
          {formatMoney(amount, currency)}
        </p>
      ) : (
        <p className="text-sm font-medium text-slate-500">{emptyLabel}</p>
      )}
      {note && hasAmount ? <p className="mt-0.5 text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

export default PriceTag;
