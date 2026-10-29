import { Checkbox, ProgressBar } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/**
 * Acceptance criteria as a self-check list (GP6). The ticks only live in this browser tab
 * ("Self-check, not saved"); the page owns `checked` so they survive switching tabs.
 */
export function AcceptanceCriteriaList({ criteria = [], checked = {}, onToggle, className }) {
  const items = Array.isArray(criteria) ? criteria.filter(Boolean) : [];
  if (!items.length) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>
        No acceptance criteria were listed for this task. Follow the problem statement and expected
        outcome.
      </p>
    );
  }

  const done = items.filter((_, index) => checked[index]).length;

  return (
    <fieldset className={className}>
      <legend className="sr-only">Acceptance criteria self-check (not saved)</legend>
      <ProgressBar
        size="sm"
        value={done}
        max={items.length}
        aria-label="Self-check progress"
        aria-valuetext={`${done} of ${items.length} criteria checked`}
      />
      <p className="mt-1.5 text-xs text-slate-500">
        {done} of {items.length} checked · Self-check, not saved
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>
            <Checkbox
              checked={Boolean(checked[index])}
              onChange={(event) => onToggle?.(index, event.target.checked)}
              label={
                <span
                  className={cn(
                    'font-normal leading-6',
                    checked[index] ? 'text-slate-500' : 'text-slate-700',
                  )}
                >
                  {item}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export default AcceptanceCriteriaList;
