import { useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  DropdownMenu,
  PageHeader,
  StatusBadge,
} from '@/shared/components/ui';
import { Ban, CheckCircle2, Clock, MoreHorizontal, UserCheck, UserCog, Users } from '@/shared/icons';
import { PAGE_SIZE_OPTIONS, USER_STATUS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { formatDate } from '@/shared/utils/helpers';
import { ClearFiltersButton } from '../components/ClearFiltersButton';
import { FilterSelect } from '../components/FilterSelect';
import { PersonCell } from '../components/PersonCell';
import { RoleBadges } from '../components/RoleBadges';
import { RoleChangeDialog } from '../components/RoleChangeDialog';
import { UserStatusDialog } from '../components/UserStatusDialog';
import { ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../constants';
import { fetchAdminUsers } from '../hooks/useAdminUsers';
import { useUrlFilters } from '../hooks/useUrlFilters';

const FILTER_KEYS = ['role', 'status'];

const actionsButtonId = (userId) => `user-actions-${userId}`;

/**
 * The menu item that opened a dialog no longer exists when the dialog closes, so send focus back to
 * the row's actions button (after the dialog's own focus restore has run).
 */
function focusRowActions(userId) {
  if (!userId || typeof window === 'undefined') return;
  window.requestAnimationFrame(() => document.getElementById(actionsButtonId(userId))?.focus());
}

function EmailVerified({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
      <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      Not verified
    </span>
  );
}

/** GP7 user and role management: search, filter by role/status, change roles, suspend or reactivate. */
export function UsersPage() {
  useDocumentTitle('Users');
  const { user: currentUser, updateUser } = useAuth();
  const currentUserId = currentUser?._id;
  const { values, setValue, clear, activeCount } = useUrlFilters(FILTER_KEYS);
  const [roleTarget, setRoleTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const filters = useMemo(() => ({ role: values.role, status: values.status }), [values.role, values.status]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'User',
        sortable: true,
        cell: (user) => <PersonCell person={user} isYou={user._id === currentUserId} />,
      },
      {
        key: 'roles',
        header: 'Roles',
        cell: (user) => <RoleBadges roles={user.roles ?? []} />,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (user) => <StatusBadge status={user.status} />,
      },
      {
        key: 'emailVerified',
        header: 'Email',
        cell: (user) => <EmailVerified verified={Boolean(user.emailVerified)} />,
      },
      {
        key: 'createdAt',
        header: 'Joined',
        sortable: true,
        cell: (user) => <span className="whitespace-nowrap text-slate-600">{formatDate(user.createdAt)}</span>,
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (user) => {
          const isSelf = user._id === currentUserId;
          const isSuspended = user.status === USER_STATUS.SUSPENDED;
          let statusItem;
          if (isSuspended) {
            statusItem = {
              label: 'Reactivate account',
              icon: UserCheck,
              onClick: () => setStatusTarget({ user, nextStatus: USER_STATUS.ACTIVE }),
            };
          } else if (isSelf) {
            statusItem = { label: "You can't suspend yourself", icon: Ban, disabled: true };
          } else {
            statusItem = {
              label: 'Suspend account',
              icon: Ban,
              danger: true,
              onClick: () => setStatusTarget({ user, nextStatus: USER_STATUS.SUSPENDED }),
            };
          }
          return (
            <DropdownMenu
              align="end"
              label={user.name || user.email}
              trigger={
                <Button
                  id={actionsButtonId(user._id)}
                  variant="ghost"
                  size="icon"
                  leftIcon={MoreHorizontal}
                  aria-label={`Actions for ${user.name || user.email}`}
                />
              }
              items={[
                { label: 'Change roles', icon: UserCog, onClick: () => setRoleTarget(user) },
                { divider: true },
                statusItem,
              ]}
            />
          );
        },
      },
    ],
    [currentUserId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage roles and account access. Every change is recorded in the audit log."
      />

      <DataTable
        fetcher={fetchAdminUsers}
        queryKey={queryKeys.admin.users}
        filters={filters}
        columns={columns}
        searchPlaceholder="Search name or email…"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Users"
        toolbar={
          <>
            <FilterSelect
              label="Filter by role"
              allLabel="All roles"
              value={values.role}
              onChange={(value) => setValue('role', value)}
              options={ROLE_OPTIONS}
              className="sm:w-36"
            />
            <FilterSelect
              label="Filter by status"
              allLabel="All statuses"
              value={values.status}
              onChange={(value) => setValue('status', value)}
              options={USER_STATUS_OPTIONS}
              className="sm:w-40"
            />
            <ClearFiltersButton count={activeCount} onClear={() => clear()} />
          </>
        }
        emptyState={{
          icon: Users,
          title: 'No users yet',
          description: 'People appear here as soon as they register.',
        }}
      />

      <RoleChangeDialog
        user={roleTarget}
        currentUserId={currentUserId}
        onClose={() => {
          focusRowActions(roleTarget?._id);
          setRoleTarget(null);
        }}
        onSaved={(updated) => {
          // Keep the session in sync when admins change their own roles.
          if (updated?._id === currentUserId && Array.isArray(updated.roles)) {
            updateUser({ roles: updated.roles });
          }
        }}
      />
      <UserStatusDialog
        target={statusTarget}
        onClose={() => {
          focusRowActions(statusTarget?.user?._id);
          setStatusTarget(null);
        }}
      />
    </div>
  );
}

export default UsersPage;
