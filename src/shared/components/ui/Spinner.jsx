import { Loader2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const SIZES = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

/** Inline loading indicator. Colour follows `text-*` in className (brand by default). */
export function Spinner({ size = 'md', label = 'Loading', className, ...rest }) {
  return (
    <span role="status" className={cn('inline-flex items-center text-brand-600', className)} {...rest}>
      <Loader2 className={cn('animate-spin', SIZES[size] ?? SIZES.md)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Centered loader for pages and route transitions. */
export function PageLoader({ label = 'Loading…', fullScreen = false, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 text-center',
        fullScreen ? 'min-h-screen' : 'min-h-[50vh]',
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default Spinner;
