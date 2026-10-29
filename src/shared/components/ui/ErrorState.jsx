import { AlertTriangle, RefreshCw, Search, ShieldAlert, WifiOff } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { Button } from './Button';

/** Error placeholder for failed queries, with a retry action. */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  compact = false,
  className,
}) {
  let Icon = AlertTriangle;
  let heading = title ?? 'Something went wrong';
  if (error?.isNetworkError) {
    Icon = WifiOff;
    heading = title ?? "Can't reach the server";
  } else if (error?.status === 403) {
    Icon = ShieldAlert;
    heading = title ?? "You don't have access";
  } else if (error?.status === 404) {
    Icon = Search;
    heading = title ?? 'Not found';
  }
  const body = message ?? getErrorMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-8' : 'rounded-xl border border-rose-200 bg-rose-50/40 px-6 py-12',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{heading}</h3>
      {body ? <p className="mt-1.5 max-w-md text-sm text-slate-600">{body}</p> : null}
      {onRetry ? (
        <div className="mt-6">
          <Button variant="outline" leftIcon={RefreshCw} onClick={() => onRetry()}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ErrorState;
