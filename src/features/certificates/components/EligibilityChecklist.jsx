import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  ProgressBar,
  SkeletonText,
} from '@/shared/components/ui';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  ListChecks,
} from '@/shared/icons';
import { ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { ELIGIBILITY_STATE, useCertificateEligibility } from '../hooks/useCertificateEligibility';

const STATE_STYLES = {
  [ELIGIBILITY_STATE.DONE]: {
    icon: CheckCircle2,
    chip: 'bg-emerald-50 text-emerald-600 ring-emerald-600/20',
    text: 'text-emerald-700',
    label: 'Done',
  },
  [ELIGIBILITY_STATE.CURRENT]: {
    icon: Clock,
    chip: 'bg-amber-50 text-amber-600 ring-amber-600/20',
    text: 'text-amber-700',
    label: 'In progress',
  },
  [ELIGIBILITY_STATE.BLOCKED]: {
    icon: AlertCircle,
    chip: 'bg-rose-50 text-rose-600 ring-rose-600/20',
    text: 'text-rose-700',
    label: 'Action needed',
  },
  [ELIGIBILITY_STATE.UPCOMING]: {
    icon: Circle,
    chip: 'bg-slate-50 text-slate-400 ring-slate-500/20',
    text: 'text-slate-500',
    label: 'Not yet',
  },
};

function ChecklistRow({ label, requirement, children }) {
  const style = STATE_STYLES[requirement.state] ?? STATE_STYLES[ELIGIBILITY_STATE.UPCOMING];
  const Icon = style.icon;
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
          style.chip,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <span className={cn('text-xs font-semibold', style.text)}>{style.label}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-600">{requirement.text}</p>
        {children}
      </div>
    </li>
  );
}

/**
 * What still stands between the student and their certificate (GP12): payment confirmed, tasks
 * approved (x of y) and no submissions waiting for review. Each row pairs an icon with text.
 */
export function EligibilityChecklist({ enrollment, className }) {
  const eligibility = useCertificateEligibility(enrollment);
  const { payment, tasks, reviews, doneCount, totalCount } = eligibility;

  let body;
  if (eligibility.isLoading) {
    body = (
      <div role="status">
        <span className="sr-only">Loading your progress…</span>
        <SkeletonText lines={6} />
      </div>
    );
  } else if (eligibility.isError) {
    body = (
      <ErrorState
        compact
        title="Couldn't load your task progress"
        error={eligibility.error}
        onRetry={() => eligibility.refetch()}
      />
    );
  } else {
    body = (
      <ol className="divide-y divide-slate-100" aria-label="Certificate requirements">
        <ChecklistRow label="Payment confirmed" requirement={payment}>
          {payment.needsPayment && enrollment?._id ? (
            <Button
              as={Link}
              to={paths.payment(enrollment._id)}
              size="sm"
              variant={payment.state === ELIGIBILITY_STATE.BLOCKED ? 'primary' : 'outline'}
              leftIcon={CreditCard}
              className="mt-3"
            >
              {payment.state === ELIGIBILITY_STATE.BLOCKED ? 'Retry payment' : 'Complete payment'}
            </Button>
          ) : null}
        </ChecklistRow>
        <ChecklistRow label="Tasks approved" requirement={tasks}>
          {tasks.total > 0 ? (
            <ProgressBar
              className="mt-3 max-w-sm"
              size="sm"
              value={tasks.approved}
              max={tasks.total}
              variant={tasks.state === ELIGIBILITY_STATE.DONE ? 'success' : 'brand'}
              aria-label="Tasks approved"
              aria-valuetext={`${tasks.approved} of ${tasks.total} tasks approved`}
            />
          ) : null}
        </ChecklistRow>
        <ChecklistRow label="Reviews complete" requirement={reviews} />
      </ol>
    );
  }

  const showTasksLink = eligibility.isActive && tasks.state !== ELIGIBILITY_STATE.DONE;

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={ListChecks}
        title="Certificate checklist"
        description="Your certificate is issued automatically and emailed to you once every mandatory task is approved."
        action={
          eligibility.isLoading || eligibility.isError ? null : (
            <Badge variant={doneCount === totalCount ? 'success' : 'neutral'}>
              {doneCount} of {totalCount} done
            </Badge>
          )
        }
      />
      <CardBody>{body}</CardBody>
      {showTasksLink ? (
        <CardFooter>
          <Button as={Link} to={ROUTES.TASKS} variant="outline" rightIcon={ArrowRight}>
            Go to your tasks
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export default EligibilityChecklist;
