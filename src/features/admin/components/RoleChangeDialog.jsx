import { useId, useState } from 'react';
import { Checkbox, ConfirmDialog, toast } from '@/shared/components/ui';
import { ROLE_LABELS, ROLE_LIST, ROLES } from '@/shared/constants';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { ROLE_DESCRIPTIONS } from '../constants';
import { useUpdateUserRoles } from '../hooks/useAdminUsers';
import { RoleBadges } from './RoleBadges';

const orderRoles = (roles = []) => ROLE_LIST.filter((role) => roles.includes(role));

function listRoles(roles) {
  const labels = roles.map((role) => (ROLE_LABELS[role] ?? role).toLowerCase());
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * GP7 role editor: one checkbox per role (at least one), a "now → after saving" summary and a confirm.
 * Admins cannot remove their own ADMIN role (the checkbox is locked with an explanation; the API enforces
 * it too). `user` = the row being edited (null = closed). `onSaved(updatedUser)` runs after a save.
 */
export function RoleChangeDialog({ user, currentUserId, onClose, onSaved }) {
  const open = Boolean(user);
  const groupId = useId();
  const mutation = useUpdateUserRoles();

  // Keep the last user while the dialog closes, and start fresh every time it opens.
  const [shownUser, setShownUser] = useState(user);
  const [selected, setSelected] = useState(() => orderRoles(user?.roles));
  const [serverError, setServerError] = useState(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen || (open && user !== shownUser)) {
    setWasOpen(open);
    if (open) {
      setShownUser(user);
      setSelected(orderRoles(user?.roles));
      setServerError(null);
    }
  }

  const target = shownUser;
  const isSelf = Boolean(target && currentUserId && target._id === currentUserId);
  const currentRoles = orderRoles(target?.roles);
  const nextRoles = orderRoles(selected);
  const isEmpty = nextRoles.length === 0;
  const isChanged = currentRoles.join('|') !== nextRoles.join('|');
  const isSaving = mutation.isPending;

  const toggle = (role, checked) => {
    setServerError(null);
    setSelected((current) => (checked ? orderRoles([...current, role]) : current.filter((item) => item !== role)));
  };

  const handleConfirm = async () => {
    if (!target || isEmpty || !isChanged || isSaving) return;
    try {
      const updated = await mutation.mutateAsync({ id: target._id, roles: nextRoles });
      toast.success('Roles updated', {
        description: `${target.name || 'This user'} is now ${listRoles(nextRoles)}.`,
      });
      if (onSaved) onSaved(updated && updated._id ? updated : { ...target, roles: nextRoles });
      onClose();
    } catch (error) {
      const fieldMessage = getFieldErrors(error).roles;
      if (fieldMessage) setServerError(fieldMessage);
      else toast.error("Roles weren't updated", { description: getErrorMessage(error) });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Change roles"
      message={
        target ? (
          <>
            Choose what <span className="font-medium text-slate-900">{target.name || target.email}</span> can
            do in the portal. The change is recorded in the audit log.
          </>
        ) : null
      }
      confirmLabel="Save roles"
      loading={isSaving}
      confirmDisabled={isEmpty || !isChanged}
    >
      <div className="space-y-4">
        <fieldset aria-describedby={isEmpty || serverError ? `${groupId}-error` : undefined}>
          <legend className="mb-3 text-sm font-medium text-slate-700">Roles</legend>
          <div className="space-y-3">
            {ROLE_LIST.map((role) => {
              const isLocked = isSelf && role === ROLES.ADMIN;
              return (
                <Checkbox
                  key={role}
                  label={ROLE_LABELS[role]}
                  description={isLocked ? "You can't remove your own admin role." : ROLE_DESCRIPTIONS[role]}
                  checked={selected.includes(role)}
                  disabled={isLocked || isSaving}
                  onChange={(event) => toggle(role, event.target.checked)}
                />
              );
            })}
          </div>
          {isEmpty || serverError ? (
            <p id={`${groupId}-error`} role="alert" className="mt-3 text-xs text-rose-600">
              {serverError || 'Choose at least one role.'}
            </p>
          ) : null}
        </fieldset>

        <dl className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
          <dt className="text-slate-500">Now</dt>
          <dd>
            <RoleBadges roles={currentRoles} />
          </dd>
          <dt className="text-slate-500">After saving</dt>
          <dd className="flex flex-wrap items-center gap-2">
            {isEmpty ? (
              <span className="font-medium text-rose-700">No roles</span>
            ) : (
              <RoleBadges roles={nextRoles} />
            )}
            {!isChanged ? <span className="text-xs text-slate-500">(no change)</span> : null}
          </dd>
        </dl>
      </div>
    </ConfirmDialog>
  );
}

export default RoleChangeDialog;
