import { Avatar } from '@/shared/components/ui';
import { Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { isTeamItem, ownerName } from '../utils/reviewHelpers';

/**
 * "Who is this work from": a student (avatar, name, email) or a team (team icon, name and the
 * member who submitted). Works with queue items, assignments and submission details.
 */
export function OwnerCell({ item, secondary, size = 'sm', className }) {
  const team = isTeamItem(item);
  const name = ownerName(item);

  let subtitle = secondary;
  if (subtitle === undefined) {
    if (team) {
      subtitle = item?.submittedBy?.name ? `Team · submitted by ${item.submittedBy.name}` : 'Team';
    } else {
      subtitle = item?.student?.email ?? '';
    }
  }

  const chipSize = size === 'md' ? 'h-10 w-10' : 'h-8 w-8';

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {team ? (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600',
            chipSize,
          )}
          aria-hidden="true"
        >
          <Users className={size === 'md' ? 'h-5 w-5' : 'h-4 w-4'} />
        </span>
      ) : (
        <Avatar name={name} size={size === 'md' ? 'md' : 'sm'} aria-hidden="true" />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{name}</p>
        {subtitle ? <p className="truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default OwnerCell;
