import { Link } from 'react-router-dom';
import { Button, Card, SkeletonCard, Stepper } from '@/shared/components/ui';
import { ArrowRight, Briefcase, ClipboardCheck, Rocket } from '@/shared/icons';
import { ASSESSMENT_QUESTION_COUNT, ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const JOURNEY_STEPS = [
  { label: 'Assessment', description: `${ASSESSMENT_QUESTION_COUNT} quick questions` },
  { label: 'Plan & terms', description: 'Pick a domain and duration' },
  { label: 'Payment', description: 'Secure checkout' },
  { label: 'Start learning', description: 'Schedule, SOPs and tasks' },
];

/**
 * Dashboard for a student who has not enrolled yet. With an assessment attempt the next step is
 * choosing a plan for that designation; otherwise it is finding an internship and taking its
 * assessment. Every score can continue — there is no pass mark.
 */
export function NoEnrollmentState({ latestAttempt, isLoading = false, className }) {
  if (isLoading) {
    return <SkeletonCard lines={4} className={className} />;
  }

  const hasAttempt = Boolean(latestAttempt?.designationId);
  const designationName = latestAttempt?.designation?.name;
  const Icon = hasAttempt ? ClipboardCheck : Rocket;

  const title = hasAttempt ? 'Choose your plan' : 'Start with the assessment';
  const description = hasAttempt
    ? `You've completed the ${designationName ? `${designationName} ` : ''}assessment. Pick a domain and duration to see your price and start your internship.`
    : `Pick an internship, take its ${ASSESSMENT_QUESTION_COUNT}-question assessment, then choose your plan. Every score can enroll, and a higher score unlocks a bigger discount.`;

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="bg-gradient-to-br from-brand-50 via-white to-white p-6 sm:p-8">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700"
          aria-hidden="true"
        >
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {hasAttempt ? (
            <>
              <Button
                as={Link}
                to={paths.enroll({ designationId: latestAttempt.designationId })}
                rightIcon={ArrowRight}
              >
                Choose your plan
              </Button>
              <Button as={Link} to={ROUTES.CATALOG} variant="outline" leftIcon={Briefcase}>
                Browse other internships
              </Button>
            </>
          ) : (
            <Button as={Link} to={ROUTES.CATALOG} rightIcon={ArrowRight}>
              Browse internships
            </Button>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
        <h3 className="eyebrow mb-5">How it works</h3>
        <Stepper
          steps={JOURNEY_STEPS}
          current={hasAttempt ? 1 : 0}
          aria-label="Your path to an internship"
        />
      </div>
    </Card>
  );
}

export default NoEnrollmentState;
