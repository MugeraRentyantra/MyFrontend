import { Link } from 'react-router-dom';
import { Card, ProgressBar, StatusBadge } from '@/shared/components/ui';
import { ROUTES, TASK_STATUS } from '@/shared/constants';
import { Award, Hourglass } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { pluralize } from '@/shared/utils/helpers';
import { countByStatus, pickNextTask, taskLabel } from '../utils/taskActions';
import { TaskActions } from './TaskActions';

/** Status counts in reading order; the dot colour is decoration next to a text label. */
const SUMMARY_ITEMS = [
  { status: TASK_STATUS.AVAILABLE, label: 'Available', dot: 'bg-brand-500' },
  { status: TASK_STATUS.IN_PROGRESS, label: 'In progress', dot: 'bg-sky-500' },
  { status: TASK_STATUS.SUBMITTED, label: 'Submitted', dot: 'bg-violet-500' },
  { status: TASK_STATUS.CHANGES_REQUESTED, label: 'Changes requested', dot: 'bg-orange-500' },
  { status: TASK_STATUS.APPROVED, label: 'Approved', dot: 'bg-emerald-500' },
  { status: TASK_STATUS.LOCKED, label: 'Locked', dot: 'bg-slate-400' },
];

function NextUp({ tasks, counts }) {
  const next = pickNextTask(tasks);
  const allApproved = tasks.length > 0 && counts[TASK_STATUS.APPROVED] === tasks.length;

  if (next) {
    return (
      <>
        <p className="eyebrow">Next up</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {taskLabel(next.task?.sequence)}
          <StatusBadge status={next.status} />
        </div>
        <p className="mt-1.5 line-clamp-2 break-words text-sm font-semibold text-slate-900">
          {next.task?.title}
        </p>
        <TaskActions progress={next} size="sm" className="mt-3" />
      </>
    );
  }

  if (allApproved) {
    return (
      <>
        <p className="eyebrow">All done</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
          <Award className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          Every task is approved. Great work!
        </p>
        <Link to={ROUTES.CERTIFICATE} className="link mt-3 inline-block text-sm">
          View your certificate
        </Link>
      </>
    );
  }

  const waiting = counts[TASK_STATUS.SUBMITTED];
  return (
    <>
      <p className="eyebrow">Next up</p>
      <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
        <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
        {waiting
          ? `Nothing to do right now: ${pluralize(waiting, 'task')} ${waiting === 1 ? 'is' : 'are'} waiting for review.`
          : 'Nothing to do right now. New tasks unlock as earlier ones are approved.'}
      </p>
    </>
  );
}

/** Summary strip of the task board (GP5): approved x/y, counts per status and the next task. */
export function TaskSummary({ tasks = [], className }) {
  const counts = countByStatus(tasks);
  const total = tasks.length;
  const approved = counts[TASK_STATUS.APPROVED];

  return (
    <Card padding="none" className={cn('grid lg:grid-cols-[minmax(0,1fr)_20rem]', className)}>
      <section aria-label="Progress" className="min-w-0 p-5">
        <ProgressBar
          value={approved}
          max={total || 1}
          label={`${approved} of ${pluralize(total, 'task')} approved`}
          showValue
          aria-valuetext={`${approved} of ${total} tasks approved`}
        />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          {SUMMARY_ITEMS.map((item) => (
            <div key={item.status} className="flex min-w-0 items-center gap-2">
              <dt className="flex min-w-0 items-center gap-2 text-slate-500">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', item.dot)} aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </dt>
              <dd className="tabular ml-auto font-semibold text-slate-900">
                {counts[item.status]}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-label="Next up"
        className="min-w-0 rounded-b-xl border-t border-slate-100 bg-slate-50/70 p-5 lg:rounded-b-none lg:rounded-r-xl lg:border-l lg:border-t-0"
      >
        <NextUp tasks={tasks} counts={counts} />
      </section>
    </Card>
  );
}

export default TaskSummary;
