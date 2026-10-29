import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  DataTable,
  DropdownMenu,
  PageHeader,
  StatusBadge,
} from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import { useDisclosure, useDocumentTitle } from '@/shared/hooks';
import { CalendarDays, ListChecks, MoreHorizontal, Plus } from '@/shared/icons';
import { formatDuration } from '@/shared/utils/helpers';
import { getSchedules } from '@/services/adminScheduleService';
import { queryKeys } from '@/services/queryKeys';
import { CreateScheduleDialog } from '../components/CreateScheduleDialog';
import { UpdatedCell } from '../components/ScheduleCells';
import { ScheduleFilters } from '../components/ScheduleFilters';
import { useScheduleCatalogOptions, useScheduleListFilters } from '../hooks/useSchedules';
import { scheduleName } from '../utils/format';

const INITIAL_SORT = { key: 'updatedAt', direction: 'desc' };

/**
 * /admin/schedules — every schedule template version (KD6) with designation / domain / status
 * filters. "New schedule" creates a draft and opens it in the editor.
 */
export default function ScheduleListPage() {
  useDocumentTitle('Schedules');
  const navigate = useNavigate();
  const createDialog = useDisclosure();
  const [filters, setFilters] = useScheduleListFilters();
  const options = useScheduleCatalogOptions();

  const columns = useMemo(
    () => [
      {
        key: 'designation.name',
        header: 'Designation',
        sortable: true,
        cell: (row) => (
          <span className="block min-w-[9rem] font-medium text-slate-900">
            {row.designation?.name ?? 'Unknown designation'}
          </span>
        ),
      },
      {
        key: 'domain.name',
        header: 'Domain',
        sortable: true,
        cell: (row) => (
          <span className="block min-w-[7rem]">{row.domain?.name ?? 'Unknown domain'}</span>
        ),
      },
      {
        key: 'durationMonths',
        header: 'Duration',
        sortable: true,
        cell: (row) => <span className="whitespace-nowrap">{formatDuration(row.durationMonths)}</span>,
      },
      {
        key: 'version',
        header: 'Version',
        align: 'right',
        sortable: true,
        cell: (row) => <span className="tabular">v{row.version}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'daysCount',
        header: 'Days',
        align: 'right',
        cell: (row) => <span className="tabular">{row.daysCount ?? '—'}</span>,
      },
      {
        key: 'tasksCount',
        header: 'Tasks',
        align: 'right',
        cell: (row) => <span className="tabular">{row.tasksCount ?? '—'}</span>,
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        cell: (row) => <UpdatedCell value={row.updatedAt} />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        width: '3.5rem',
        cell: (row) => (
          <DropdownMenu
            align="end"
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${scheduleName(row)}, version ${row.version}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            }
            items={[
              { label: 'Edit days', icon: CalendarDays, to: paths.adminSchedule(row._id) },
              { label: 'Manage tasks', icon: ListChecks, to: paths.adminScheduleTasks(row._id) },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const newScheduleButton = (
    <Button leftIcon={Plus} onClick={createDialog.open}>
      New schedule
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Day-wise plans for each designation, domain and duration. Publishing locks a version: new enrollments get it, and active students keep the version they started with."
        actions={newScheduleButton}
      />

      <DataTable
        caption="Schedule templates"
        columns={columns}
        fetcher={getSchedules}
        queryKey={queryKeys.admin.schedules}
        filters={filters}
        initialSort={INITIAL_SORT}
        searchPlaceholder="Search designation or domain…"
        toolbar={
          <ScheduleFilters
            value={filters}
            onChange={setFilters}
            designations={options.designations}
            domains={options.domains}
            loading={options.isLoading}
          />
        }
        onRowClick={(row) => navigate(paths.adminSchedule(row._id))}
        emptyState={{
          icon: CalendarDays,
          title: 'No schedules yet',
          description:
            'Create the first day-wise schedule for a designation and domain. You can add tasks once it exists.',
          action: (
            <Button leftIcon={Plus} onClick={createDialog.open}>
              New schedule
            </Button>
          ),
        }}
      />

      <CreateScheduleDialog
        open={createDialog.isOpen}
        onClose={createDialog.close}
        defaultValues={filters}
      />
    </div>
  );
}
