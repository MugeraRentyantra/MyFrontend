import { isValidElement } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const VARIANTS = {
  info: {
    container: 'border-sky-200 bg-sky-50 text-sky-900',
    icon: Info,
    iconClass: 'text-sky-600',
    body: 'text-sky-800',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    body: 'text-emerald-800',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    body: 'text-amber-800',
  },
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: XCircle,
    iconClass: 'text-rose-600',
    body: 'text-rose-800',
  },
};

/**
 * Page-level notice with an optional next-step action (SN13 edge states). Uses role=alert for
 * warnings and errors so screen readers announce them.
 */
export function StatusBanner({
  variant = 'info',
  title,
  children,
  icon,
  action,
  onDismiss,
  className,
  ...rest
}) {
  const config = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = icon ?? config.icon;
  const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status';

  return (
    <div role={role} className={cn('flex gap-3 rounded-xl border p-4', config.container, className)} {...rest}>
      {isValidElement(Icon) ? (
        Icon
      ) : (
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.iconClass)} aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {title ? <p className="text-sm font-semibold">{title}</p> : null}
          {children ? (
            <div className={cn('text-sm', title ? 'mt-1' : '', config.body)}>{children}</div>
          ) : null}
        </div>
        {action ? <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export const Alert = StatusBanner;

export default StatusBanner;
