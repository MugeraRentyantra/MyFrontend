import { cn } from '@/shared/utils/cn';
import { planMeta, planTitle } from '../utils/format';

/** Designation on the first line, "domain · duration" below (PlanRef from the API). */
export function PlanCell({ plan, className }) {
  const title = planTitle(plan);
  const meta = planMeta(plan);
  return (
    <div className={cn('min-w-0 max-w-[16rem]', className)}>
      <p className="truncate font-medium text-slate-900" title={title}>
        {title}
      </p>
      {meta ? (
        <p className="truncate text-xs text-slate-500" title={meta}>
          {meta}
        </p>
      ) : null}
    </div>
  );
}

export default PlanCell;
