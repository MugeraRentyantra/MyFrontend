import { useId } from 'react';
import { GraduationCap, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { TARGET_TYPE } from '../utils/assignmentHelpers';

const OPTIONS = [
  { value: TARGET_TYPE.ENROLLMENT, label: 'Student enrollment', icon: GraduationCap },
  { value: TARGET_TYPE.TEAM, label: 'Team', icon: Users },
];

/**
 * Segmented control for the assignment target type (KD11). Native radios underneath, so arrow keys
 * move between the options and screen readers announce a radio group.
 */
export function TargetTypeToggle({ value, onChange, disabled = false, className }) {
  const name = useId();

  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      <legend className="text-sm font-medium text-slate-700">Assign to</legend>
      <div className="mt-2 flex w-full rounded-lg bg-slate-100 p-1 sm:inline-flex sm:w-auto">
        {OPTIONS.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = value === option.value;
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                'relative flex min-h-[2.5rem] flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 sm:flex-none',
                checked ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500"
              />
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default TargetTypeToggle;
