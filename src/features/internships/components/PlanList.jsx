import { useMemo } from 'react';
import { Button } from '@/shared/components/ui';
import { CalendarDays } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDuration } from '@/shared/utils/helpers';
import { MAX_EXAMPLE_DISCOUNT_PERCENT } from '../utils/catalogFormat';
import { getDomainVisual } from '../utils/designationVisuals';
import { PriceTag } from './PriceTag';

/** Groups plans by domain (sorted by domain name), each group's plans sorted by duration. */
function groupPlansByDomain(plans) {
  const groups = new Map();
  plans.forEach((plan) => {
    const domain = plan.domain ?? { _id: plan.domainId, name: 'Domain', slug: '' };
    const key = domain._id ?? plan.domainId;
    if (!groups.has(key)) groups.set(key, { domain, plans: [] });
    groups.get(key).plans.push(plan);
  });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      plans: [...group.plans].sort((a, b) => Number(a.durationMonths) - Number(b.durationMonths)),
    }))
    .sort((a, b) => String(a.domain.name).localeCompare(String(b.domain.name)));
}

/**
 * Plans of one designation grouped by domain (SN5). Shows each duration's server base price and
 * a "Preview schedule" action. `domainsById` (Map) optionally supplies domain descriptions.
 */
export function PlanList({ plans = [], onPreview, domainsById, className }) {
  const groups = useMemo(() => groupPlansByDomain(plans), [plans]);
  const discountNote =
    MAX_EXAMPLE_DISCOUNT_PERCENT > 0
      ? `+ up to ${MAX_EXAMPLE_DISCOUNT_PERCENT}% merit discount for individuals`
      : undefined;

  return (
    <div className={cn('space-y-4', className)}>
      {groups.map(({ domain, plans: domainPlans }) => {
        const visual = getDomainVisual(domain.slug || domain.name);
        const Icon = visual.icon;
        const headingId = `plan-domain-${domain._id}`;
        const description = domainsById?.get?.(domain._id)?.description;

        return (
          <section
            key={domain._id}
            aria-labelledby={headingId}
            className="rounded-xl border border-slate-200 bg-white shadow-card"
          >
            <div className="flex items-start gap-3 px-5 pt-5">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  visual.tint,
                )}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 id={headingId} className="text-base font-semibold text-slate-900">
                  {domain.name}
                </h3>
                {description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{description}</p>
                ) : null}
              </div>
            </div>

            <ul role="list" className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {domainPlans.map((plan) => {
                const durationLabel = formatDuration(plan.durationMonths);
                return (
                  <li
                    key={plan._id}
                    className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">{durationLabel}</p>
                    <PriceTag
                      amount={plan.basePrice}
                      currency={plan.currency}
                      note={discountNote}
                      size="md"
                      className="mt-2"
                    />
                    {onPreview ? (
                      <div className="mt-3 border-t border-slate-200 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={CalendarDays}
                          onClick={() => onPreview(plan)}
                          aria-label={`Preview schedule for ${domain.name}, ${durationLabel}`}
                          className="-ml-2 min-h-[2.5rem]"
                        >
                          Preview schedule
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default PlanList;
