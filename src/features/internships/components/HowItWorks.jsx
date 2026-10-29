import { ASSESSMENT_QUESTION_COUNT } from '@/shared/constants';
import { Award, CreditCard, GitPullRequest, ListChecks, Percent, UserPlus } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { MAX_EXAMPLE_DISCOUNT_PERCENT } from '../utils/catalogFormat';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Register',
    description: 'Create your free account and verify your email address.',
  },
  {
    icon: ListChecks,
    title: `Take the ${ASSESSMENT_QUESTION_COUNT}-question assessment`,
    description: 'One attempt, no timer and no pass or fail — just show what you know.',
  },
  {
    icon: Percent,
    title: 'Unlock a merit discount',
    description:
      MAX_EXAMPLE_DISCOUNT_PERCENT > 0
        ? `Your score decides your individual discount — up to ${MAX_EXAMPLE_DISCOUNT_PERCENT}% off.`
        : 'Your score decides your individual discount.',
  },
  {
    icon: CreditCard,
    title: 'Choose a plan, accept terms and pay',
    description: 'Pick a domain and duration, review the terms and pay securely online.',
  },
  {
    icon: GitPullRequest,
    title: 'Ship day-wise tasks via GitHub',
    description: 'Follow each day’s guide, push your work to GitHub and get feedback from trainers.',
  },
  {
    icon: Award,
    title: 'Earn a verifiable certificate',
    description: 'Every certificate has a unique number that anyone can verify online.',
  },
];

/** "How it works" band of the home page (anchor: #how-it-works). */
export function HowItWorks({ className }) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className={cn('scroll-mt-20 bg-slate-50 py-16 sm:py-20', className)}
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
          >
            From sign-up to certificate in six steps
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            A clear path with no surprises: you always know what comes next and what it costs.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Step {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
