import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Button, Skeleton } from '@/shared/components/ui';
import { ArrowRight, CheckCircle2, ClipboardCheck, CreditCard, Hourglass, Mail } from '@/shared/icons';
import { ASSESSMENT_QUESTION_COUNT, MEMBER_STATUS, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatMoney } from '@/shared/utils/helpers';
import {
  isMemberReady,
  memberDisplayName,
  nextMissingStep,
  planDesignationId,
} from '../utils/teamUtils';

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
};

/** Works out the signed-in member's next step from their readiness row. */
function getStep(team, me, members) {
  const plan = team.plan;
  const designationId = planDesignationId(plan);
  const planId = team.planId ?? plan?._id;

  if (me.status === MEMBER_STATUS.INVITED || !me.joined) {
    return {
      tone: 'warning',
      icon: Mail,
      title: 'Accept your invitation',
      description: `Open the invite link we emailed to ${me.email} to join ${team.name}. Then you can take the assessment and pay for your seat.`,
    };
  }

  if (!me.assessed) {
    return {
      tone: 'brand',
      icon: ClipboardCheck,
      title: 'Take the assessment',
      description: `Every member takes the ${ASSESSMENT_QUESTION_COUNT}-question assessment before paying for their seat.`,
      action: designationId
        ? { label: 'Take the assessment', to: paths.assessment(designationId) }
        : null,
    };
  }

  if (!me.paid) {
    return {
      tone: 'brand',
      icon: CreditCard,
      title: 'Get your quote and pay (full price)',
      description: `Your seat is charged at the full plan price of ${formatMoney(plan?.basePrice, plan?.currency || 'INR')}. The assessment discount applies to individual enrollments only.`,
      action:
        designationId && planId
          ? {
              label: 'Get your quote and pay',
              to: paths.enroll({ designationId, planId, teamId: team._id }),
            }
          : null,
    };
  }

  const waiting = (members ?? []).filter(
    (member) =>
      member?.status !== MEMBER_STATUS.DECLINED &&
      member?.status !== MEMBER_STATUS.REMOVED &&
      !isMemberReady(member) &&
      (member.memberId ?? member.email) !== (me.memberId ?? me.email),
  );

  return {
    tone: 'success',
    icon: CheckCircle2,
    title: "You're all set — waiting for teammates",
    description:
      waiting.length > 0
        ? 'Your team starts as soon as everyone has joined, taken the assessment and paid.'
        : 'Everyone is ready. Your team will start shortly.',
    waiting,
  };
}

/** "Your next step" for the signed-in member of a team that has not started yet (SN11). */
export function NextStepCard({ team, me, members, isLoading = false, className }) {
  const headingId = useId();

  if (isLoading) {
    return (
      <div
        className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)}
        aria-hidden="true"
      >
        <div className="flex items-start gap-4">
          <Skeleton className="h-11 w-11" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!team || !me) return null;

  const step = getStep(team, me, members);
  const Icon = step.icon;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:p-6',
        step.tone === 'success' && 'border-emerald-200',
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
              TONES[step.tone] ?? TONES.brand,
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Your next step</p>
            <h2 id={headingId} className="mt-1 text-base font-semibold text-slate-900">
              {step.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{step.description}</p>
            {step.waiting?.length ? (
              <ul className="mt-3 space-y-1.5 text-sm" aria-label="Teammates still getting ready">
                {step.waiting.map((member) => (
                  <li
                    key={member.memberId ?? member.email}
                    className="flex items-start gap-2 text-slate-600"
                  >
                    <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <span className="min-w-0 break-words">
                      <span className="font-medium text-slate-800">{memberDisplayName(member)}</span>{' '}
                      needs to {nextMissingStep(member)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {step.action ? (
          <Button
            as={Link}
            to={step.action.to}
            rightIcon={ArrowRight}
            className="w-full shrink-0 sm:w-auto"
          >
            {step.action.label}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export default NextStepCard;
