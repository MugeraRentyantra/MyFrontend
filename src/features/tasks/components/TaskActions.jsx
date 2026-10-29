import { Link, useNavigate } from 'react-router-dom';
import { Button, toast } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { useStartTask } from '../hooks/useStartTask';
import { getTaskActions, taskFullLabel } from '../utils/taskActions';

/**
 * The allowed actions for one task (GP5, from utils/taskActions.js). "Start" calls
 * POST /tasks/:id/start and then opens the task; the others are links.
 * Locked tasks render nothing (the card explains what to complete first).
 */
export function TaskActions({ progress, size = 'sm', showIcons = true, stretch = false, className }) {
  const navigate = useNavigate();
  const startTask = useStartTask();
  const actions = getTaskActions(progress);
  if (!actions.length) return null;

  const fullLabel = taskFullLabel(progress);

  const handleStart = () => {
    startTask.mutate(progress._id, {
      onSuccess: () => {
        toast.success('Task started', {
          description: 'Read the instructions, then submit your work when it is ready.',
        });
        navigate(paths.task(progress._id));
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Could not start the task. Please try again.'));
      },
    });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {actions.map((action) => {
        const common = {
          size,
          variant: action.variant,
          leftIcon: showIcons ? action.icon : null,
          'aria-label': `${action.label} ${fullLabel}`,
          className: cn(stretch && 'flex-1'),
        };
        if (action.type === 'start') {
          return (
            <Button
              key={action.key}
              {...common}
              loading={startTask.isPending}
              onClick={handleStart}
            >
              {action.label}
            </Button>
          );
        }
        return (
          <Button key={action.key} {...common} as={Link} to={action.to}>
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

export default TaskActions;
