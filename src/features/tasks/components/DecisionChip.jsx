import { Badge } from '@/shared/components/ui';
import { REVIEW_STATUS } from '@/shared/constants';
import { CheckCircle2, Hourglass, RotateCcw, XCircle } from '@/shared/icons';
import { humanize } from '@/shared/utils/helpers';

const DECISION_META = {
  [REVIEW_STATUS.PENDING]: { label: 'Pending review', variant: 'purple', icon: Hourglass },
  [REVIEW_STATUS.APPROVED]: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  [REVIEW_STATUS.CHANGES_REQUESTED]: {
    label: 'Changes requested',
    variant: 'orange',
    icon: RotateCcw,
  },
  [REVIEW_STATUS.REJECTED]: { label: 'Rejected', variant: 'danger', icon: XCircle },
};

function getDecisionMeta(status) {
  return (
    DECISION_META[status] ?? {
      label: humanize(status) || 'Pending review',
      variant: 'neutral',
      icon: Hourglass,
    }
  );
}

/** Review outcome of one attempt (GP9): icon + label, never colour alone. */
export function DecisionChip({ status, size = 'md', className }) {
  const meta = getDecisionMeta(status);
  return (
    <Badge variant={meta.variant} size={size} icon={meta.icon} className={className}>
      {meta.label}
    </Badge>
  );
}

export default DecisionChip;
