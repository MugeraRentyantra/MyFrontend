import { ConfirmDialog } from '@/shared/components/ui';

/**
 * Prompt shown while a navigation is blocked by useUnsavedChangesGuard. "Stay" resets the blocker,
 * "Leave without saving" lets the navigation through.
 */
export function UnsavedChangesDialog({ blocker, message }) {
  const isBlocked = blocker?.state === 'blocked';

  return (
    <ConfirmDialog
      open={isBlocked}
      onClose={() => {
        if (blocker?.state === 'blocked') blocker.reset();
      }}
      onConfirm={() => {
        if (blocker?.state === 'blocked') blocker.proceed();
      }}
      title="Leave without saving?"
      message={message ?? "You have unsaved changes. If you leave now, they'll be lost."}
      confirmLabel="Leave without saving"
      cancelLabel="Stay on this page"
      variant="danger"
    />
  );
}

export default UnsavedChangesDialog;
