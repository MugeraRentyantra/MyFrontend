import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ErrorState, Select } from '@/shared/components/ui';
import { formatDuration, formatMoney } from '@/shared/utils/helpers';
import { useDesignationPlans, usePublishedDesignations } from '../hooks/useTeamPlans';
import { TeamPlanSummary } from './TeamPlanSummary';

/**
 * Designation → domain → duration picker built from the PUBLISHED plans (SN10), so every
 * combination it offers exists. A list with a single option is chosen automatically.
 * Calls `onChange(plan | null)` whenever the resulting plan changes.
 */
export function PlanPicker({ initialDesignationId = '', onChange, error, disabled = false }) {
  const errorId = `${useId()}-error`;
  const [designationId, setDesignationId] = useState(initialDesignationId);
  const [domainId, setDomainId] = useState('');
  const [duration, setDuration] = useState('');

  const designationsQuery = usePublishedDesignations();
  const designations = useMemo(() => designationsQuery.data ?? [], [designationsQuery.data]);

  // Ignore a designation (e.g. from the URL) that is not published.
  const selectedDesignationId =
    designationsQuery.isSuccess && !designations.some((item) => item._id === designationId)
      ? ''
      : designationId;

  const plansQuery = useDesignationPlans(selectedDesignationId);
  const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data]);

  const designationOptions = useMemo(
    () => designations.map((item) => ({ value: item._id, label: item.name })),
    [designations],
  );

  const domainOptions = useMemo(() => {
    const byId = new Map();
    plans.forEach((plan) => {
      const domain = plan?.domain;
      if (domain?._id && !byId.has(domain._id)) byId.set(domain._id, domain.name ?? 'Domain');
    });
    return [...byId.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [plans]);

  let effectiveDomainId = '';
  if (domainOptions.some((option) => option.value === domainId)) effectiveDomainId = domainId;
  else if (domainOptions.length === 1) effectiveDomainId = domainOptions[0].value;

  const durationPlans = useMemo(
    () =>
      plans
        .filter((plan) => plan?.domain?._id === effectiveDomainId)
        .sort((a, b) => Number(a.durationMonths) - Number(b.durationMonths)),
    [plans, effectiveDomainId],
  );

  const durationOptions = durationPlans.map((plan) => ({
    value: String(plan.durationMonths),
    label: `${formatDuration(plan.durationMonths)} · ${formatMoney(plan.basePrice, plan.currency || 'INR')}`,
  }));

  let effectiveDuration = '';
  if (durationOptions.some((option) => option.value === duration)) effectiveDuration = duration;
  else if (durationOptions.length === 1) effectiveDuration = durationOptions[0].value;

  const selectedPlan =
    durationPlans.find((plan) => String(plan.durationMonths) === effectiveDuration) ?? null;

  // Report the chosen plan to the form (the latest onChange is used without re-running the effect).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (onChangeRef.current) onChangeRef.current(selectedPlan);
  }, [selectedPlan]);

  const noPlans = Boolean(selectedDesignationId) && plansQuery.isSuccess && plans.length === 0;

  return (
    <fieldset className="min-w-0 space-y-4" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-3 text-sm font-medium text-slate-700">
        Internship plan
        <span aria-hidden="true" className="ml-0.5 text-rose-600">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </legend>

      {designationsQuery.isError ? (
        <ErrorState
          compact
          error={designationsQuery.error}
          title="Couldn't load designations"
          onRetry={() => designationsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Designation"
            value={selectedDesignationId}
            onChange={(event) => {
              setDesignationId(event.target.value);
              setDomainId('');
              setDuration('');
            }}
            options={designationOptions}
            placeholder={designationsQuery.isLoading ? 'Loading…' : 'Choose a designation'}
            disabled={disabled || designationsQuery.isLoading}
          />
          <Select
            label="Domain"
            value={effectiveDomainId}
            onChange={(event) => {
              setDomainId(event.target.value);
              setDuration('');
            }}
            options={domainOptions}
            placeholder={plansQuery.isLoading ? 'Loading…' : 'Choose a domain'}
            disabled={disabled || !selectedDesignationId || domainOptions.length === 0}
          />
          <Select
            label="Duration"
            value={effectiveDuration}
            onChange={(event) => setDuration(event.target.value)}
            options={durationOptions}
            placeholder="Choose a duration"
            disabled={disabled || !effectiveDomainId}
          />
        </div>
      )}

      {plansQuery.isError ? (
        <ErrorState
          compact
          error={plansQuery.error}
          title="Couldn't load the plans"
          onRetry={() => plansQuery.refetch()}
        />
      ) : null}

      {noPlans ? (
        <p className="text-sm text-slate-500">
          No plans are published for this designation yet. Choose another designation.
        </p>
      ) : null}

      {selectedPlan ? <TeamPlanSummary plan={selectedPlan} label="Selected plan" /> : null}

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default PlanPicker;
