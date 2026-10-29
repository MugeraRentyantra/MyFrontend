import { Stepper } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/** The student's journey from assessment to learning, shown on every enrollment screen. */
export const ENROLLMENT_STEPS = Object.freeze([
  { label: 'Assessment', description: '15 questions, one attempt' },
  { label: 'Plan & terms', description: 'Choose and accept' },
  { label: 'Payment', description: 'Secure checkout' },
  { label: 'Start learning', description: 'Day-wise tasks unlock' },
]);

/** 0-based step indexes for `current`. */
export const ENROLLMENT_STEP = Object.freeze({
  ASSESSMENT: 0,
  PLAN: 1,
  PAYMENT: 2,
  LEARN: 3,
});

/**
 * Journey stepper: Assessment → Plan & terms → Payment → Start learning.
 * `current` is the step the student is on; earlier steps show as complete.
 */
export function EnrollmentStepper({ current = ENROLLMENT_STEP.ASSESSMENT, className }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white px-3 py-4 shadow-card sm:px-6',
        className,
      )}
    >
      <Stepper steps={ENROLLMENT_STEPS} current={current} aria-label="Enrollment progress" />
    </div>
  );
}

export default EnrollmentStepper;
