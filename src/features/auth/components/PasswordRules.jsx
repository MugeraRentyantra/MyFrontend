import { useId } from 'react';
import { Check } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getPasswordRuleResults } from '../schemas/authValidation';

/**
 * Live password checklist (SN3/SN4): min length, a letter, a number. Each rule shows a check
 * icon plus hidden "met / not met yet" text (never colour alone). A polite live region only
 * announces the count of rules met, so screen readers are not flooded on every keystroke.
 *
 * Point the password input's `aria-describedby` at `id` so the rules are read with the field.
 */
export function PasswordRules({ value = '', id, title = 'Your password needs', className }) {
  const autoId = useId();
  const listId = id || autoId;
  const titleId = `${listId}-title`;
  const results = getPasswordRuleResults(value);
  const metCount = results.filter((rule) => rule.passed).length;
  const allMet = metCount === results.length;

  let summary = '';
  if (value) {
    summary = allMet
      ? 'All password requirements met.'
      : `${metCount} of ${results.length} password requirements met.`;
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5 transition-colors duration-150',
        allMet ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50',
        className,
      )}
    >
      <p id={titleId} className="text-xs font-medium text-slate-700">
        {title}
      </p>
      <ul id={listId} role="list" aria-labelledby={titleId} className="mt-1.5 space-y-1">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-xs transition-colors duration-150',
              rule.passed ? 'text-emerald-700' : 'text-slate-600',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors duration-150',
                rule.passed ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white',
              )}
            >
              {rule.passed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            <span>
              {rule.label}
              <span className="sr-only">{rule.passed ? ' (met)' : ' (not met yet)'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {summary}
      </p>
    </div>
  );
}

export default PasswordRules;
