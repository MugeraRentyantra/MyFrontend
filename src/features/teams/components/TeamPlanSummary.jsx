import { Briefcase } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatMoney } from '@/shared/utils/helpers';
import { planDetailsLabel } from '../utils/teamUtils';

/**
 * Designation · domain · duration and the full plan price (teams never get the assessment discount).
 * `plan` is a Plan or PlanRef; the price is the server's basePrice, only formatted here.
 * `action` (node) renders beside the price, e.g. a "Change plan" button.
 */
export function TeamPlanSummary({ plan, label = 'Internship plan', action, className }) {
  if (!plan) return null;
  const designation = plan.designation?.name ?? 'Internship';
  const details = planDetailsLabel(plan);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-brand-100 bg-brand-50/60 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 ring-1 ring-inset ring-brand-100"
          aria-hidden="true"
        >
          <Briefcase className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">{label}</p>
          <p className="mt-0.5 break-words font-semibold text-slate-900">{designation}</p>
          {details ? <p className="text-sm text-slate-600">{details}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-100 pt-3 sm:justify-end sm:border-0 sm:pt-0">
        <div className="sm:text-right">
          <p className="text-xl font-semibold text-slate-900">
            {formatMoney(plan.basePrice, plan.currency || 'INR')}
          </p>
          <p className="text-xs text-slate-500">Full price per member</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export default TeamPlanSummary;
