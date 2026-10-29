import { ConfirmDialog } from '@/shared/components/ui';
import { PUBLISH_STATUS } from '@/shared/constants';

export const UNPUBLISH_NOTE = 'Hidden from new students; existing enrollments are not affected.';

/**
 * Confirmation before publishing or unpublishing a catalog entry (designation, domain or plan).
 * `nextStatus` is the status being applied; `itemName` is shown in the title.
 * The dialog stays open while the request runs: the caller closes it on success.
 */
export function StatusChangeDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  nextStatus,
  itemName,
  entityLabel = 'item',
  publishMessage,
  unpublishMessage = UNPUBLISH_NOTE,
}) {
  const isPublish = nextStatus === PUBLISH_STATUS.PUBLISHED;
  const name = itemName ? `“${itemName}”` : `this ${entityLabel}`;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      variant={isPublish ? 'primary' : 'danger'}
      title={isPublish ? `Publish ${name}?` : `Unpublish ${name}?`}
      message={
        isPublish
          ? (publishMessage ?? `Students will be able to see this ${entityLabel}.`)
          : unpublishMessage
      }
      confirmLabel={isPublish ? 'Publish' : 'Unpublish'}
      cancelLabel="Cancel"
    />
  );
}

export default StatusChangeDialog;
