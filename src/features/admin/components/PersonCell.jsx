import { Avatar, Badge } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/**
 * Name + email (optionally with an avatar) for table cells and detail views.
 * `person` = { _id, name, email } (any of them may be missing).
 */
export function PersonCell({ person, isYou = false, showAvatar = true, avatarSize = 'sm', className }) {
  const name = person?.name || person?.email || 'Unknown user';
  const email = person?.name ? person?.email : null;

  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {showAvatar ? <Avatar name={name} size={avatarSize} aria-hidden="true" /> : null}
      <div className="min-w-0 max-w-[16rem]">
        <p className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium text-slate-900" title={name}>
            {name}
          </span>
          {isYou ? (
            <Badge variant="brand" className="shrink-0">
              You
            </Badge>
          ) : null}
        </p>
        {email ? (
          <p className="truncate text-xs text-slate-500" title={email}>
            {email}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default PersonCell;
