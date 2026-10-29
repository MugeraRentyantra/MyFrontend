import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  PageHeader,
  Select,
  toast,
} from '@/shared/components/ui';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import {
  GraduationCap,
  MoreHorizontal,
  RefreshCw,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from '@/shared/icons';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDate, formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { AssignTrainerDialog } from '../components/AssignTrainerDialog';
import { useAssignmentsTable, useRemoveAssignment } from '../hooks/useAssignments';
import {
  TARGET_TYPE,
  assignmentPlan,
  isAssignmentActive,
  planLabel,
  targetFromAssignment,
} from '../utils/assignmentHelpers';

const STATUS_FILTERS = [
  { value: 'true', label: 'Active assignments' },
  { value: 'all', label: 'All assignments' },
  { value: 'false', label: 'Ended assignments' },
];

/** Student enrollment "Name · plan" or team "Team name (n members)". */
function TargetCell({ row }) {
  const target = targetFromAssignment(row);
  const isTeam = target.type === TARGET_TYPE.TEAM;
  const Icon = isTeam ? Users : GraduationCap;
  const membersCount = Number(row.team?.membersCount ?? row.membersCount) || 0;
  const plan = planLabel(assignmentPlan(row));
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={
          isTeam
            ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600'
            : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600'
        }
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {target.name}
          {isTeam && membersCount > 0 ? (
            <span className="font-normal text-slate-500">
              {' '}
              ({membersCount} {membersCount === 1 ? 'member' : 'members'})
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-slate-500">
          {isTeam ? 'Team' : 'Student'}
          {plan ? ` · ${plan}` : ''}
        </p>
      </div>
    </div>
  );
}

/** /admin/assignments (KD11): who reviews which student enrollment or team. */
export function AssignmentsPage() {
  useDocumentTitle('Trainer assignments');
  const { fetcher, queryKey } = useAssignmentsTable();
  const removeMutation = useRemoveAssignment();
  const [activeFilter, setActiveFilter] = useState('true');
  const [dialog, setDialog] = useState({ open: false, target: null });
  const [toUnassign, setToUnassign] = useState(null);

  // "All" sends no filter, so an empty list shows the designed empty state (the API defaults to all).
  const filters = useMemo(
    () => (activeFilter === 'all' ? {} : { active: activeFilter }),
    [activeFilter],
  );

  const openAssign = (target = null) => setDialog({ open: true, target });
  const closeAssign = () => setDialog({ open: false, target: null });

  const confirmUnassign = () => {
    if (!toUnassign || removeMutation.isPending) return;
    const row = toUnassign;
    removeMutation.mutate(row._id, {
      onSuccess: () => {
        toast.success('Trainer unassigned', {
          description: `${row.trainer?.name ?? 'The trainer'} no longer reviews work from ${targetFromAssignment(row).name}.`,
        });
        setToUnassign(null);
      },
      onError: (error) => {
        toast.error("We couldn't unassign the trainer", { description: getErrorMessage(error) });
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        key: 'trainer',
        header: 'Trainer',
        className: 'min-w-[13rem]',
        cell: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.trainer?.name ?? ''} size="sm" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{row.trainer?.name ?? 'Unknown trainer'}</p>
              {row.trainer?.email ? (
                <p className="truncate text-xs text-slate-500">{row.trainer.email}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'target',
        header: 'Assigned to',
        className: 'min-w-[16rem]',
        cell: (row) => <TargetCell row={row} />,
      },
      {
        key: 'assignedAt',
        header: 'Assigned',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <div>
            <time dateTime={row.assignedAt} title={formatDateTime(row.assignedAt)}>
              {formatDate(row.assignedAt)}
            </time>
            <p className="text-xs text-slate-500">{formatRelativeTime(row.assignedAt)}</p>
          </div>
        ),
      },
      {
        key: 'assignedBy',
        header: 'Assigned by',
        className: 'whitespace-nowrap text-slate-600',
        cell: (row) => row.assignedBy?.name ?? <span className="text-slate-500">—</span>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => {
          const active = isAssignmentActive(row);
          return (
            <div className="flex flex-col items-start gap-1">
              <Badge variant={active ? 'success' : 'neutral'} dot>
                {active ? 'Active' : 'Ended'}
              </Badge>
              {!active && row.unassignedAt ? (
                <span className="whitespace-nowrap text-xs text-slate-500">
                  on {formatDate(row.unassignedAt)}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (row) => {
          const active = isAssignmentActive(row);
          const target = targetFromAssignment(row);
          return (
            <DropdownMenu
              label={target.name}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${row.trainer?.name ?? 'trainer'} and ${target.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </Button>
              }
              items={[
                {
                  label: active ? 'Reassign trainer' : 'Assign a trainer again',
                  icon: RefreshCw,
                  onClick: () => openAssign(target),
                  disabled: !target.id,
                },
                active
                  ? { divider: true }
                  : null,
                active
                  ? {
                      label: 'Unassign',
                      icon: UserX,
                      danger: true,
                      onClick: () => setToUnassign(row),
                    }
                  : null,
              ].filter(Boolean)}
            />
          );
        },
      },
    ],
    // openAssign/setToUnassign only set state, so the columns never need rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const unassignTarget = toUnassign ? targetFromAssignment(toUnassign) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer assignments"
        description="Choose who reviews each student's and team's work. Reassigning keeps the history."
        actions={
          <Button leftIcon={UserPlus} onClick={() => openAssign()}>
            Assign trainer
          </Button>
        }
      />

      <DataTable
        columns={columns}
        fetcher={fetcher}
        queryKey={queryKey}
        filters={filters}
        searchPlaceholder="Search trainer, student or team…"
        pageSize={10}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Trainer assignments"
        toolbar={
          <Select
            size="sm"
            aria-label="Show"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            options={STATUS_FILTERS}
            className="w-full sm:w-52"
          />
        }
        emptyState={{
          icon: UserCog,
          title: 'No trainer assignments yet',
          description: 'Assign a trainer to a student enrollment or a team so their work gets reviewed.',
          action: (
            <Button leftIcon={UserPlus} onClick={() => openAssign()}>
              Assign trainer
            </Button>
          ),
        }}
      />

      <AssignTrainerDialog open={dialog.open} onClose={closeAssign} initialTarget={dialog.target} />

      <ConfirmDialog
        open={Boolean(toUnassign)}
        onClose={() => {
          if (!removeMutation.isPending) setToUnassign(null);
        }}
        onConfirm={confirmUnassign}
        variant="danger"
        title="Unassign this trainer?"
        confirmLabel="Unassign"
        loading={removeMutation.isPending}
        message={
          toUnassign ? (
            <>
              <strong className="font-medium text-slate-900">
                {toUnassign.trainer?.name ?? 'This trainer'}
              </strong>{' '}
              will stop reviewing work from{' '}
              <strong className="font-medium text-slate-900">{unassignTarget?.name}</strong>. New
              submissions wait unreviewed until you assign someone else. The assignment stays in the
              history.
            </>
          ) : null
        }
      />
    </div>
  );
}

export default AssignmentsPage;
