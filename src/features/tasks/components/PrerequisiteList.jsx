import { Link } from 'react-router-dom';
import { StatusBadge } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const LINK_CLASSES =
  'rounded-sm font-medium text-slate-800 transition-colors duration-150 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

/** Prerequisite tasks with their status and a link to each (GP6). */
export function PrerequisiteList({
  prerequisites = [],
  emptyText = 'This task has no prerequisites.',
  className,
}) {
  if (!prerequisites.length) {
    return <p className={cn('text-sm text-slate-500', className)}>{emptyText}</p>;
  }

  return (
    <ul className={cn('divide-y divide-slate-100', className)}>
      {prerequisites.map((item, index) => (
        <li
          key={item.progressId ?? item.taskId ?? index}
          className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span className="min-w-0 break-words text-sm">
            {item.progressId ? (
              <Link to={paths.task(item.progressId)} className={LINK_CLASSES}>
                {item.title || 'Untitled task'}
              </Link>
            ) : (
              <span className="font-medium text-slate-800">{item.title || 'Untitled task'}</span>
            )}
          </span>
          <StatusBadge status={item.status} className="shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export default PrerequisiteList;
