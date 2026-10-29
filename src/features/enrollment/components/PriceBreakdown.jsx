import { Badge, Button, Card, CardBody, CardHeader, ErrorState, Skeleton } from '@/shared/components/ui';
import { ASSESSMENT_MAX_SCORE, ENROLLMENT_TYPE } from '@/shared/constants';
import { Clock, Lock, Receipt, RefreshCw, Tag, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDate, formatDateTime, formatMoney, formatRelativeTime } from '@/shared/utils/helpers';

const hasValue = (value) => value !== undefined && value !== null;

/**
 * The price lines of a server quote or an enrollment's price snapshot: base price, the merit
 * discount (individual enrollments only) and the payable amount. Display only — every amount,
 * including the payable total, comes from the server.
 */
export function PriceLines({
  basePrice,
  discountPercent,
  payableAmount,
  currency = 'INR',
  enrollmentType,
  score,
  totalQuestions = ASSESSMENT_MAX_SCORE,
  payableLabel = 'You pay',
  className,
}) {
  const isTeam = enrollmentType === ENROLLMENT_TYPE.TEAM;
  const hasDiscount = Number(discountPercent) > 0;

  return (
    <div className={className}>
      <dl className="space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-slate-600">Base price</dt>
          <dd className="font-medium text-slate-900">{formatMoney(basePrice, currency)}</dd>
        </div>

        {!isTeam ? (
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-600">
              Merit discount
              {hasValue(score) ? (
                <span className="block text-xs text-slate-500">
                  Assessment score {score} / {totalQuestions}
                </span>
              ) : null}
            </dt>
            <dd
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                hasDiscount ? 'text-emerald-700' : 'text-slate-500',
              )}
            >
              {hasDiscount ? (
                <>
                  <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  {`−${discountPercent}%`}
                </>
              ) : (
                'None'
              )}
            </dd>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-slate-200 pt-3">
          <dt className="font-medium text-slate-900">{payableLabel}</dt>
          <dd className="text-2xl font-semibold tracking-tight text-slate-900">
            {formatMoney(payableAmount, currency)}
          </dd>
        </div>
      </dl>

      {isTeam ? (
        <p className="mt-4 flex gap-2 rounded-lg bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-800">
          <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Team enrollments pay the full plan price — no discount applies.
        </p>
      ) : null}
    </div>
  );
}

function PriceSkeleton() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Getting your price…</span>
      <div className="flex items-center justify-between" aria-hidden="true">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center justify-between" aria-hidden="true">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-10" />
      </div>
      <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3" aria-hidden="true">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  );
}

/**
 * Price summary card (SN7, SN8). Pass a server `quote` (shows "Price held until …" and the
 * expired state) or an enrollment `snapshot` + `enrollmentType` (locked price). `children`
 * render at the bottom of the card (e.g. the continue button).
 */
export function PriceBreakdown({
  quote = null,
  snapshot = null,
  enrollmentType,
  score,
  title = 'Your price',
  isLoading = false,
  isRefreshing = false,
  error = null,
  onRetry,
  isExpired = false,
  onRefresh,
  emptyMessage = 'Choose a plan to see your price.',
  lockedAt,
  className,
  children,
}) {
  const price = quote ?? snapshot;
  const type = quote?.enrollmentType ?? enrollmentType;
  const lineScore = quote ? quote.score : score;

  let headerAction = null;
  if (quote && isExpired) {
    headerAction = (
      <Badge variant="warning" icon={Clock}>
        Expired
      </Badge>
    );
  } else if (snapshot && !quote) {
    headerAction = (
      <Badge variant="neutral" icon={Lock}>
        Locked
      </Badge>
    );
  }

  let body;
  if (price) {
    body = (
      <div
        className={cn('transition-opacity duration-150', isRefreshing && 'opacity-60')}
        aria-busy={isRefreshing || undefined}
      >
        <PriceLines
          basePrice={price.basePrice}
          discountPercent={price.discountPercent}
          payableAmount={price.payableAmount}
          currency={price.currency}
          enrollmentType={type}
          score={lineScore}
        />

        {quote && !isExpired ? (
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Clock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Price held until{' '}
              <time dateTime={quote.expiresAt} className="font-medium text-slate-700">
                {formatDateTime(quote.expiresAt)}
              </time>{' '}
              ({formatRelativeTime(quote.expiresAt)})
            </span>
          </p>
        ) : null}

        {quote && isExpired ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            <p>
              This price expired at{' '}
              <time dateTime={quote.expiresAt} className="font-medium">
                {formatDateTime(quote.expiresAt)}
              </time>
              . Get a fresh quote to continue.
            </p>
            {onRefresh ? (
              <Button
                size="sm"
                variant="outline"
                leftIcon={RefreshCw}
                loading={isRefreshing}
                onClick={onRefresh}
                className="mt-3"
              >
                Refresh quote
              </Button>
            ) : null}
          </div>
        ) : null}

        {snapshot && !quote ? (
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Price locked{lockedAt ? ` on ${formatDate(lockedAt)}` : ''}. Later price changes don't
              affect it.
            </span>
          </p>
        ) : null}
      </div>
    );
  } else if (isLoading) {
    body = <PriceSkeleton />;
  } else if (error) {
    body = (
      <ErrorState
        compact
        error={error}
        title="We couldn't get your price"
        onRetry={onRetry}
        retryLabel="Try again"
      />
    );
  } else {
    body = (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
        <Receipt className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        {emptyMessage}
      </p>
    );
  }

  return (
    <Card padding="none" className={className}>
      <CardHeader icon={Receipt} title={title} action={headerAction} />
      <CardBody>
        {body}
        <p className="sr-only" aria-live="polite">
          {price && !isRefreshing ? `Payable amount ${formatMoney(price.payableAmount, price.currency)}` : ''}
        </p>
        {children ? <div className="mt-5 border-t border-slate-100 pt-5">{children}</div> : null}
      </CardBody>
    </Card>
  );
}

export default PriceBreakdown;
