import { formatDuration } from '@/shared/utils/helpers';

/**
 * Small, pure helpers for Plan / PlanRef objects from the API. Prices are only read and
 * compared here (to order or label options), never calculated.
 */

/** The domain id of a Plan or PlanRef. */
export function planDomainId(plan) {
  return plan?.domain?._id ?? plan?.domainId ?? null;
}

/** The designation id of a Plan or PlanRef. */
export function planDesignationId(plan) {
  return plan?.designation?._id ?? plan?.designationId ?? null;
}

/** "Banking · 3 months" */
export function planShortLabel(plan) {
  if (!plan) return '';
  return [plan.domain?.name, plan.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');
}

/** "Java Developer · Banking · 3 months" */
export function planLabel(plan) {
  if (!plan) return '';
  return [plan.designation?.name, planShortLabel(plan)].filter(Boolean).join(' · ');
}

/**
 * Groups plans by domain, sorted by domain name; plans inside a group are sorted by duration.
 * Returns [{ domain: { _id, name, slug }, plans: Plan[], lowestPrice, currency }] where
 * `lowestPrice` is the smallest server base price in the group (used for a "from ₹X" label).
 */
export function groupPlansByDomain(plans = []) {
  const groups = new Map();
  plans.forEach((plan) => {
    const id = planDomainId(plan);
    if (!id) return;
    if (!groups.has(id)) {
      groups.set(id, {
        domain: plan.domain ?? { _id: id, name: 'Domain', slug: '' },
        plans: [],
      });
    }
    groups.get(id).plans.push(plan);
  });

  return [...groups.values()]
    .map((group) => {
      const sorted = [...group.plans].sort(
        (a, b) => Number(a.durationMonths) - Number(b.durationMonths),
      );
      const lowest = sorted.reduce(
        (best, plan) => (best === null || plan.basePrice < best.basePrice ? plan : best),
        null,
      );
      return {
        ...group,
        plans: sorted,
        lowestPrice: lowest?.basePrice ?? null,
        currency: lowest?.currency ?? 'INR',
      };
    })
    .sort((a, b) => String(a.domain.name).localeCompare(String(b.domain.name)));
}
