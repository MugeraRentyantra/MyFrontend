import { useState } from 'react';
import { ConfirmDialog, toast } from '@/shared/components/ui';
import { USER_STATUS } from '@/shared/constants';
import { getErrorMessage } from '@/shared/utils/errors';
import { useUpdateUserStatus } from '../hooks/useAdminUsers';

/**
 * GP7 suspend / reactivate confirmation. `target` = { user, nextStatus: 'SUSPENDED' | 'ACTIVE' } or null.
 * Suspending is a danger action: the person is signed out and cannot log in until reactivated.
 */
export function UserStatusDialog({ target, onClose }) {
  const mutation = useUpdateUserStatus();

  // Keep showing the last target while the dialog closes.
  const [shown, setShown] = useState(target);
  if (target && target !== shown) setShown(target);

  const user = shown?.user;
  const name = user?.name || user?.email || 'this user';
  const isSuspending = shown?.nextStatus === USER_STATUS.SUSPENDED;

  const handleConfirm = async () => {
    if (!target?.user || mutation.isPending) return;
    try {
      await mutation.mutateAsync({ id: target.user._id, status: target.nextStatus });
      if (isSuspending) {
        toast.success(`${name} is suspended`, { description: 'They can no longer log in.' });
      } else {
        toast.success(`${name} is reactivated`, { description: 'They can log in again.' });
      }
      onClose();
    } catch (error) {
      toast.error(isSuspending ? "The account wasn't suspended" : "The account wasn't reactivated", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <ConfirmDialog
      open={Boolean(target)}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={isSuspending ? `Suspend ${name}?` : `Reactivate ${name}?`}
      message={
        isSuspending
          ? 'They will be signed out and cannot log in until an admin reactivates the account. Their enrollments, submissions and certificates are kept as they are.'
          : 'They will be able to log in again with their existing password. Nothing else about the account changes.'
      }
      confirmLabel={isSuspending ? 'Suspend account' : 'Reactivate account'}
      variant={isSuspending ? 'danger' : 'primary'}
      loading={mutation.isPending}
    />
  );
}

export default UserStatusDialog;
