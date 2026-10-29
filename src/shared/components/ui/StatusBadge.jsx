import { getStatusMeta } from '@/shared/constants';
import { Badge } from './Badge';

/**
 * Status pill for any API enum value (KD2): <StatusBadge status="PENDING_PAYMENT" />.
 * Label and colour come from STATUS_META; unknown values are humanised with a neutral colour.
 */
export function StatusBadge({ status, label, size = 'sm', dot = true, ...rest }) {
  const meta = getStatusMeta(status);
  return (
    <Badge variant={meta.variant} size={size} dot={dot} data-status={status ?? undefined} {...rest}>
      {label ?? meta.label}
    </Badge>
  );
}

export default StatusBadge;
