import { useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { clamp } from '@/shared/utils/helpers';

const SIZES = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

// The track is a lighter step of the fill's own hue so the state reads across the whole bar.
const VARIANTS = {
  brand: { track: 'bg-brand-100', fill: 'bg-brand-600' },
  success: { track: 'bg-emerald-100', fill: 'bg-emerald-600' },
  warning: { track: 'bg-amber-100', fill: 'bg-amber-500' },
  danger: { track: 'bg-rose-100', fill: 'bg-rose-600' },
};

/**
 * Determinate progress meter. `label` is visible on the left, `showValue` prints the percentage on the right.
 * Without a visible label pass `aria-label` (falls back to "Progress").
 */
export function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  size = 'md',
  variant = 'brand',
  className,
  'aria-label': ariaLabel,
  'aria-valuetext': ariaValueText,
  ...rest
}) {
  const labelId = useId();
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const numeric = Number(value);
  const current = clamp(Number.isFinite(numeric) ? numeric : 0, 0, safeMax);
  const percentage = Math.round((current / safeMax) * 100);
  const tone = VARIANTS[variant] ?? VARIANTS.brand;
  const hasHeader = Boolean(label) || showValue;
  const useLabelledBy = Boolean(label) && !ariaLabel;

  return (
    <div className={cn('w-full', className)} {...rest}>
      {hasHeader ? (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
          {label ? (
            <span id={labelId} className="min-w-0 font-medium text-slate-700">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue ? (
            <span className="tabular shrink-0 text-slate-500" aria-hidden="true">
              {percentage}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={ariaValueText ?? `${percentage}%`}
        aria-labelledby={useLabelledBy ? labelId : undefined}
        aria-label={useLabelledBy ? undefined : (ariaLabel ?? 'Progress')}
        className={cn('w-full overflow-hidden rounded-full', SIZES[size] ?? SIZES.md, tone.track)}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tone.fill)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
