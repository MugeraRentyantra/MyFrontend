import { Link } from 'react-router-dom';
import { Button, Card, CardFooter, StatusBadge } from '@/shared/components/ui';
import { ROUTES, paths } from '@/shared/constants';
import { ArrowLeft, ArrowRight, Lock } from '@/shared/icons';
import { getMissingPrerequisites } from '../utils/taskActions';

/**
 * Shown instead of the instructions while a task is locked (GP6): every prerequisite that is
 * not approved yet, with its status and a link to it.
 */
export function LockedTaskNotice({ progress }) {
  const missing = getMissingPrerequisites(progress);
  const description = missing.length
    ? `Get ${missing.length === 1 ? 'this task' : `these ${missing.length} tasks`} approved and this one unlocks automatically.`
    : 'It unlocks automatically once the earlier tasks are approved.';

  return (
    <Card padding="none">
      <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
          aria-hidden="true"
        >
          <Lock className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-900">This task is locked</h2>
        <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>
      </div>

      {missing.length ? (
        <div className="px-5 py-5 sm:px-8">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Complete first
          </h3>
          <ul className="mt-3 space-y-2">
            {missing.map((item, index) => (
              <li
                key={item.progressId ?? item.taskId ?? index}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="min-w-0 break-words text-sm font-medium text-slate-900">
                  {item.title || 'Untitled task'}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={item.status} />
                  {item.progressId ? (
                    <Button
                      as={Link}
                      to={paths.task(item.progressId)}
                      size="sm"
                      variant="outline"
                      rightIcon={ArrowRight}
                      aria-label={`Open ${item.title || 'prerequisite task'}`}
                    >
                      Open
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="pb-6" />
      )}

      <CardFooter className="justify-center sm:justify-end">
        <Button as={Link} to={ROUTES.TASKS} variant="ghost" size="sm" leftIcon={ArrowLeft}>
          All tasks
        </Button>
      </CardFooter>
    </Card>
  );
}

export default LockedTaskNotice;
