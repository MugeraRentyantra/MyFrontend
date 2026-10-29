import { Badge } from '@/shared/components/ui';
import { AlertTriangle, Clock, Hourglass } from '@/shared/icons';
import { formatAge, formatDateTime } from '@/shared/utils/helpers';
import { getAgeLevel } from '../utils/reviewHelpers';

const LEVELS = {
  fresh: { variant: 'neutral', icon: Clock, srText: 'waiting less than a day' },
  aging: { variant: 'warning', icon: Hourglass, srText: 'waiting more than a day' },
  overdue: { variant: 'danger', icon: AlertTriangle, srText: 'waiting more than three days' },
};

/**
 * How long a submission has waited for review (KD9): neutral under 24 h, amber 24–72 h, rose after
 * 72 h. The age is always written out and overdue items say so, so colour is never the only signal.
 */
export function AgeBadge({ submittedAt, size = 'sm', className }) {
  const level = getAgeLevel(submittedAt);
  const meta = LEVELS[level];
  const age = formatAge(submittedAt);

  return (
    <Badge
      variant={meta.variant}
      size={size}
      icon={meta.icon}
      title={`Submitted ${formatDateTime(submittedAt)}`}
      className={className}
    >
      <span>{age}</span>
      {level === 'overdue' ? <span aria-hidden="true">· Overdue</span> : null}
      <span className="sr-only">, {meta.srText}</span>
    </Badge>
  );
}

export default AgeBadge;
