import { ASSESSMENT_QUESTION_COUNT } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const STEPS = [
  {
    title: 'Take the assessment',
    description: `${ASSESSMENT_QUESTION_COUNT} questions, one attempt, no timer and no pass or fail.`,
  },
  {
    title: 'See your discount',
    description: 'Your score decides your individual discount on any plan of this internship.',
  },
  {
    title: 'Choose a plan and pay',
    description: 'Pick a domain and duration, accept the terms and pay securely.',
  },
  {
    title: 'Start day 1',
    description: 'Your schedule, daily guides and tasks unlock as soon as payment is confirmed.',
  },
];

/** Side card on the designation page: the four steps from browsing to day 1. */
export function EnrollmentSteps({ headingAs: Heading = 'h2', className }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)}>
      <Heading className="text-base font-semibold text-slate-900">How enrollment works</Heading>
      <ol className="mt-4 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default EnrollmentSteps;
