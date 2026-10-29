import { Check } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

function getStatus(index, current) {
  if (index < current) return 'complete';
  if (index === current) return 'current';
  return 'upcoming';
}

const LABEL_TONE = {
  complete: 'text-slate-900',
  current: 'text-brand-700',
  upcoming: 'text-slate-500',
};

function StepCircle({ status, number }) {
  return (
    <span
      className={cn(
        'relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-150',
        status === 'complete' && 'border-brand-600 bg-brand-600 text-white',
        status === 'current' && 'border-brand-600 bg-white text-brand-700 ring-4 ring-brand-100',
        status === 'upcoming' && 'border-slate-300 bg-white text-slate-500',
      )}
      aria-hidden="true"
    >
      {status === 'complete' ? <Check className="h-4 w-4" strokeWidth={3} /> : number}
    </span>
  );
}

function CompletedHint({ status }) {
  return status === 'complete' ? <span className="sr-only"> (completed)</span> : null;
}

/**
 * Progress through a multi-step flow: steps = [{ label, description }], current = 0-based index
 * (steps.length means every step is complete). The current step has aria-current="step".
 * Horizontal: circles joined by connectors, labels below from sm; on mobile a "Step 2 of 4: Label" line.
 */
export function Stepper({
  steps = [],
  current = 0,
  orientation = 'horizontal',
  className,
  'aria-label': ariaLabel = 'Progress',
  ...rest
}) {
  const count = steps.length;
  if (!count) return null;
  const active = Math.min(Math.max(Number(current) || 0, 0), count);

  if (orientation === 'vertical') {
    return (
      <div className={cn('min-w-0', className)} {...rest}>
        <ol aria-label={ariaLabel}>
          {steps.map((step, index) => {
            const status = getStatus(index, active);
            const isLast = index === count - 1;
            return (
              <li
                key={index}
                className={cn('relative flex gap-3', !isLast && 'pb-8')}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                {!isLast ? (
                  <span
                    className={cn(
                      'absolute bottom-0 left-4 top-8 -ml-px w-0.5',
                      index < active ? 'bg-brand-600' : 'bg-slate-200',
                    )}
                    aria-hidden="true"
                  />
                ) : null}
                <StepCircle status={status} number={index + 1} />
                <div className="min-w-0 pt-1">
                  <p className={cn('text-sm font-medium', LABEL_TONE[status])}>
                    {step.label}
                    <CompletedHint status={status} />
                  </p>
                  {step.description ? (
                    <p className="mt-0.5 text-sm text-slate-500">{step.description}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const currentStep = active < count ? steps[active] : null;

  return (
    <div className={cn('w-full min-w-0', className)} {...rest}>
      <ol
        aria-label={ariaLabel}
        className="grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const status = getStatus(index, active);
          return (
            <li
              key={index}
              className="relative flex flex-col items-center text-center"
              aria-current={status === 'current' ? 'step' : undefined}
            >
              {index > 0 ? (
                <span
                  className={cn(
                    'absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2',
                    index <= active ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <StepCircle status={status} number={index + 1} />
              <div className="mt-2 w-full px-1">
                <span className="sr-only sm:not-sr-only sm:block">
                  <span className={cn('block text-sm font-medium', LABEL_TONE[status])}>
                    {step.label}
                    <CompletedHint status={status} />
                  </span>
                  {step.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{step.description}</span>
                  ) : null}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {currentStep ? (
        <p className="mt-3 text-center text-sm text-slate-600 sm:hidden" aria-hidden="true">
          Step {active + 1} of {count}:{' '}
          <span className="font-medium text-slate-900">{currentStep.label}</span>
        </p>
      ) : null}
    </div>
  );
}

export default Stepper;
