import { Link } from 'react-router-dom';
import { Badge, Skeleton, SkeletonText } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import { ArrowRight, CalendarDays } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDuration, pluralize } from '@/shared/utils/helpers';
import { getDesignationVisual } from '../utils/designationVisuals';
import { PriceTag } from './PriceTag';

const MAX_DOMAIN_CHIPS = 3;

/**
 * Catalog card for one designation summary (from useInternships):
 * { designation, minPrice, currency, durations[], domains[] }.
 * The title link is stretched over the whole card, so the card is one keyboard stop.
 */
export function InternshipCard({ summary, headingAs: Heading = 'h3', className }) {
  const { designation, minPrice, currency, durations = [], domains = [] } = summary;
  const visual = getDesignationVisual(designation.slug || designation.name);
  const Icon = visual.icon;
  const extraDomains = Math.max(0, domains.length - MAX_DOMAIN_CHIPS);
  const hasPlans = durations.length > 0;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
        'transition duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <div className={cn('h-1 w-full bg-gradient-to-r', visual.gradient)} aria-hidden="true" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
              visual.gradient,
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <Heading className="text-base font-semibold leading-snug text-slate-900">
              <Link
                to={paths.designation(designation.slug)}
                className={cn(
                  'rounded-sm outline-none transition-colors group-hover:text-brand-700',
                  'after:absolute after:inset-0 after:rounded-xl',
                  // The card clips overflow, so the focus ring is drawn inside its edge.
                  'focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand-500',
                )}
              >
                {designation.name}
              </Link>
            </Heading>
            <p className="mt-0.5 text-xs text-slate-500">
              {hasPlans
                ? `${pluralize(domains.length, 'domain')} · ${pluralize(durations.length, 'duration')}`
                : 'Plans coming soon'}
            </p>
          </div>
        </div>

        {designation.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">
            {designation.description}
          </p>
        ) : null}

        {hasPlans ? (
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="sr-only">Durations</dt>
              <dd className="flex flex-wrap items-center gap-1.5">
                <CalendarDays className="mr-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                {durations.map((months) => (
                  <span
                    key={months}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {formatDuration(months)}
                  </span>
                ))}
              </dd>
            </div>
            {domains.length > 0 ? (
              <div>
                <dt className="sr-only">Domains</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {domains.slice(0, MAX_DOMAIN_CHIPS).map((domain) => (
                    <Badge key={domain._id} variant="brand">
                      {domain.name}
                    </Badge>
                  ))}
                  {extraDomains > 0 ? <Badge variant="neutral">+{extraDomains} more</Badge> : null}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <PriceTag amount={minPrice} currency={currency} prefix="From" size="md" />
            <span
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700"
              aria-hidden="true"
            >
              View details
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Placeholder with the same footprint as InternshipCard. */
export function InternshipCardSkeleton({ className }) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} className="mt-4" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-16" rounded="full" />
        <Skeleton className="h-5 w-16" rounded="full" />
        <Skeleton className="h-5 w-20" rounded="full" />
      </div>
      <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export default InternshipCard;
