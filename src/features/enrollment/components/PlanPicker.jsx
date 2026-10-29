import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  RadioGroup,
  Skeleton,
} from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { Layers, Lock, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDuration, formatMoney, pluralize } from '@/shared/utils/helpers';
import { groupPlansByDomain, planDomainId, planShortLabel } from '../utils/plans';

function PlanPickerSkeleton() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading plans…</span>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-[74px] w-full" rounded="lg" />
          <Skeleton className="h-[74px] w-full" rounded="lg" />
        </div>
      </div>
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Skeleton className="h-[74px] w-full" rounded="lg" />
          <Skeleton className="h-[74px] w-full" rounded="lg" />
          <Skeleton className="h-[74px] w-full" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

/** Read-only plan for team members: the team leader chose it when creating the team. */
function LockedPlan({ plan, note }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"
          aria-hidden="true"
        >
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">
              {planShortLabel(plan) || 'Your team plan'}
            </p>
            <Badge variant="purple" icon={Lock}>
              Team plan
            </Badge>
          </div>
          {plan?.basePrice !== undefined && plan?.basePrice !== null ? (
            <p className="mt-1 text-sm text-slate-600">
              Base price {formatMoney(plan.basePrice, plan.currency)}
            </p>
          ) : null}
          {note ? <p className="mt-2 text-xs text-slate-500">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Plan selection (SN7, SN8): domain first, then duration, from the designation's published plans.
 * Shows server base prices only — the payable amount always comes from a server quote.
 *
 * Props: `plans` (Plan[] of one designation), `value` (plan id), `onChange(planId | null)`,
 * `lockedPlan` (PlanRef: read-only team plan), `lockedNote`, `isLoading`, `error`, `onRetry`,
 * `disabled`, `className`.
 */
export function PlanPicker({
  plans = [],
  value = null,
  onChange,
  lockedPlan = null,
  lockedNote,
  isLoading = false,
  error = null,
  onRetry,
  disabled = false,
  className,
}) {
  const groups = useMemo(() => groupPlansByDomain(plans), [plans]);
  const selectedPlan = useMemo(
    () => (value ? (plans.find((plan) => plan._id === value) ?? null) : null),
    [plans, value],
  );
  const [pickedDomainId, setPickedDomainId] = useState(null);

  // With exactly one plan there is nothing to choose: select it.
  const onlyPlanId = plans.length === 1 ? plans[0]._id : null;
  useEffect(() => {
    if (lockedPlan || disabled || value || !onlyPlanId || !onChange) return;
    onChange(onlyPlanId);
  }, [lockedPlan, disabled, value, onlyPlanId, onChange]);

  if (lockedPlan) {
    return (
      <div className={className}>
        <LockedPlan plan={lockedPlan} note={lockedNote} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <PlanPickerSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        compact
        error={error}
        title="We couldn't load the plans"
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (!groups.length) {
    return (
      <EmptyState
        compact
        icon={Layers}
        title="No plans are open for enrollment yet"
        description="New plans are published regularly. Explore other internships in the meantime."
        action={
          <Button as={Link} to={ROUTES.CATALOG} variant="outline" size="sm">
            Browse internships
          </Button>
        }
        className={className}
      />
    );
  }

  const activeDomainId =
    (selectedPlan && planDomainId(selectedPlan)) ||
    pickedDomainId ||
    (groups.length === 1 ? groups[0].domain._id : null);
  const activeGroup = groups.find((group) => group.domain._id === activeDomainId) ?? null;
  const selectedInGroup =
    selectedPlan && planDomainId(selectedPlan) === activeDomainId ? selectedPlan._id : '';

  const handleDomainChange = (domainId) => {
    setPickedDomainId(domainId);
    if (selectedPlan && planDomainId(selectedPlan) === domainId) return;
    const group = groups.find((item) => item.domain._id === domainId);
    // Keep the chosen duration when the new domain offers it; a single duration needs no choice.
    const sameDuration =
      selectedPlan && group
        ? group.plans.find(
            (plan) => Number(plan.durationMonths) === Number(selectedPlan.durationMonths),
          )
        : null;
    const next = sameDuration ?? (group?.plans.length === 1 ? group.plans[0] : null);
    if (onChange) onChange(next?._id ?? null);
  };

  const domainOptions = groups.map((group) => ({
    value: group.domain._id,
    label: group.domain.name,
    description: `${pluralize(group.plans.length, 'duration')} · from ${formatMoney(
      group.lowestPrice,
      group.currency,
    )}`,
  }));

  const durationOptions = (activeGroup?.plans ?? []).map((plan) => ({
    value: plan._id,
    label: formatDuration(plan.durationMonths),
    description: `${formatMoney(plan.basePrice, plan.currency)} base price`,
  }));

  return (
    <div className={cn('space-y-6', className)}>
      <RadioGroup
        name="enroll-plan-domain"
        label="1. Choose a domain"
        options={domainOptions}
        value={activeDomainId ?? ''}
        onChange={handleDomainChange}
        variant="cards"
        disabled={disabled}
        optionsClassName="sm:grid-cols-2"
      />

      {activeGroup ? (
        <RadioGroup
          name="enroll-plan-duration"
          label="2. Choose a duration"
          hint="Base prices before any discount. Your final price is confirmed by our server."
          options={durationOptions}
          value={selectedInGroup}
          onChange={(planId) => onChange?.(planId)}
          variant="cards"
          disabled={disabled}
          optionsClassName="grid-cols-2 sm:grid-cols-3"
        />
      ) : (
        <div>
          <p className="text-sm font-medium text-slate-700">2. Choose a duration</p>
          <p className="mt-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-sm text-slate-500">
            Choose a domain first to see its durations and prices.
          </p>
        </div>
      )}
    </div>
  );
}

export default PlanPicker;
