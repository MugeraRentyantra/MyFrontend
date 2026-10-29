import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  SkeletonText,
  StatusBadge,
} from '@/shared/components/ui';
import {
  ArrowRight,
  Award,
  ClipboardList,
  Clock,
  Hourglass,
  Target,
  Trophy,
} from '@/shared/icons';
import { ROUTES, TASK_STATUS, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const NEXT_TASK_COPY = {
  [TASK_STATUS.CHANGES_REQUESTED]: {
    action: 'Resubmit task',
    hint: 'Your trainer asked for changes. Read the feedback, update your work and submit again.',
  },
  [TASK_STATUS.IN_PROGRESS]: {
    action: 'Continue task',
    hint: "You've started this task. Submit your work when it's ready for review.",
  },
  [TASK_STATUS.AVAILABLE]: {
    action: 'Open task',
    hint: 'This task is unlocked and ready for you.',
  },
};

function QuietState({ icon: Icon, tone = 'slate', title, description, action }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-500',
    emerald: 'bg-emerald-50 text-emerald-600',
    brand: 'bg-brand-50 text-brand-600',
  };
  return (
    <div className="flex flex-col items-center px-2 py-4 text-center">
      <span
        className={cn('flex h-11 w-11 items-center justify-center rounded-full', tones[tone])}
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * The task to work on next: first CHANGES_REQUESTED, else IN_PROGRESS, else AVAILABLE
 * (`nextTask` is picked by the dashboard hook). Without one it explains why.
 */
export function NextTaskCard({
  nextTask,
  tasks = [],
  isTeam = false,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  className,
}) {
  let content;
  if (isLoading) {
    content = <SkeletonText lines={4} />;
  } else if (isError) {
    content = (
      <ErrorState
        compact
        error={error}
        title="We couldn't load your tasks"
        onRetry={onRetry}
      />
    );
  } else if (nextTask) {
    const copy = NEXT_TASK_COPY[nextTask.status] ?? NEXT_TASK_COPY[TASK_STATUS.AVAILABLE];
    const sequence = nextTask.task?.sequence;
    const hours = nextTask.task?.estimatedHours;
    content = (
      <div className="flex h-full flex-col">
        {sequence ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Task {sequence}
          </p>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">
          {nextTask.task?.title ?? 'Untitled task'}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge status={nextTask.status} />
          {hours ? (
            <span className="inline-flex items-center gap-1 text-sm text-slate-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              About {hours} {Number(hours) === 1 ? 'hour' : 'hours'}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-slate-600">{copy.hint}</p>
        <div className="mt-auto pt-5">
          <Button as={Link} to={paths.task(nextTask._id)} fullWidth rightIcon={ArrowRight}>
            {copy.action}
          </Button>
        </div>
      </div>
    );
  } else if (tasks.length === 0) {
    content = (
      <QuietState
        icon={ClipboardList}
        title="No tasks yet"
        description={
          isTeam
            ? "Your team's tasks appear here once the team starts."
            : 'Tasks appear here once your schedule starts.'
        }
      />
    );
  } else if (tasks.every((progress) => progress.status === TASK_STATUS.APPROVED)) {
    content = (
      <QuietState
        icon={Trophy}
        tone="emerald"
        title="Every task is approved"
        description="Great work. Your certificate is the next step."
        action={
          <Button as={Link} to={ROUTES.CERTIFICATE} variant="outline" leftIcon={Award}>
            View certificate
          </Button>
        }
      />
    );
  } else {
    content = (
      <QuietState
        icon={Hourglass}
        tone="brand"
        title="You're all caught up"
        description="Your submitted work is with your trainer. New tasks unlock as reviews come in."
        action={
          <Button as={Link} to={ROUTES.TASKS} variant="outline">
            View tasks
          </Button>
        }
      />
    );
  }

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader title="Next up" icon={Target} />
      <CardBody className="flex flex-1 flex-col">{content}</CardBody>
    </Card>
  );
}

export default NextTaskCard;
