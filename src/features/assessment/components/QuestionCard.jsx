import { forwardRef, useId, useRef } from 'react';
import { CheckCircle2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * One assessment question (SN6): a fieldset whose legend holds the question heading and native
 * radios styled as large cards (arrow keys move between options; keys 1–4 pick an option).
 * The forwarded ref points at the heading so the page can move focus to it on step change.
 */
export const QuestionCard = forwardRef(function QuestionCard(
  { question, index, total, selectedIndex, onSelect, className },
  headingRef,
) {
  const baseId = useId();
  const inputRefs = useRef([]);
  const options = Array.isArray(question?.options) ? question.options : [];
  const groupName = `question-${question?._id ?? index}`;

  const handleKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!/^[1-9]$/.test(event.key)) return;
    const optionIndex = Number(event.key) - 1;
    if (optionIndex >= options.length) return;
    event.preventDefault();
    onSelect(optionIndex);
    inputRefs.current[optionIndex]?.focus();
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6',
        className,
      )}
    >
      <fieldset onKeyDown={handleKeyDown} className="min-w-0">
        <legend className="w-full">
          <span className="eyebrow block" aria-hidden="true">
            Question {index + 1} of {total}
          </span>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 whitespace-pre-line text-lg font-semibold leading-snug text-slate-900 focus:outline-none focus-visible:outline-none sm:text-xl"
          >
            <span className="sr-only">
              Question {index + 1} of {total}:{' '}
            </span>
            {question?.text}
          </h2>
        </legend>

        <div className="mt-5 grid gap-3">
          {options.map((option, optionIndex) => {
            const checked = selectedIndex === optionIndex;
            const inputId = `${baseId}-${question?._id ?? index}-${optionIndex}`;
            return (
              <label
                key={`${question?._id ?? index}-${optionIndex}`}
                htmlFor={inputId}
                className={cn(
                  'relative flex min-h-[3.5rem] cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors duration-150 sm:p-4',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 has-[:focus-visible]:ring-offset-2',
                  checked
                    ? 'border-brand-600 bg-brand-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <input
                  ref={(node) => {
                    inputRefs.current[optionIndex] = node;
                  }}
                  id={inputId}
                  type="radio"
                  name={groupName}
                  value={optionIndex}
                  checked={checked}
                  onChange={() => onSelect(optionIndex)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold transition-colors duration-150',
                    checked
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 bg-white text-slate-600',
                  )}
                  aria-hidden="true"
                >
                  {OPTION_LETTERS[optionIndex] ?? optionIndex + 1}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-line text-sm leading-relaxed text-slate-800 sm:text-base">
                  {option}
                </span>
                <CheckCircle2
                  className={cn('h-5 w-5 shrink-0 text-brand-600', !checked && 'invisible')}
                  aria-hidden="true"
                />
              </label>
            );
          })}
        </div>

        <p className="mt-4 hidden text-xs text-slate-500 sm:block">
          Tip: press 1–{options.length || 4} to choose an option, or use the arrow keys.
        </p>
      </fieldset>
    </div>
  );
});

export default QuestionCard;
