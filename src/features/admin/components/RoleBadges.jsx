import { Badge } from '@/shared/components/ui';
import { ROLE_LABELS, ROLE_LIST } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { ROLE_BADGE_VARIANT } from '../constants';

/** One pill per role, always in Student → Trainer → Admin order. */
export function RoleBadges({ roles = [], emptyLabel = 'No roles', className }) {
  const ordered = ROLE_LIST.filter((role) => roles.includes(role));
  const unknown = roles.filter((role) => !ROLE_LIST.includes(role));
  const all = [...ordered, ...unknown];

  if (all.length === 0) {
    return <span className={cn('text-sm text-slate-500', className)}>{emptyLabel}</span>;
  }

  return (
    <span className={cn('inline-flex flex-wrap gap-1.5', className)}>
      {all.map((role) => (
        <Badge key={role} variant={ROLE_BADGE_VARIANT[role] ?? 'neutral'}>
          {ROLE_LABELS[role] ?? role}
        </Badge>
      ))}
    </span>
  );
}

export default RoleBadges;
