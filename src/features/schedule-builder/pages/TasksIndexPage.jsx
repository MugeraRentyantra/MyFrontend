import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, DataTable, PageHeader, StatusBanner, StatusBadge } from '@/shared/components/ui';
import { ROUTES, paths } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { ArrowRight, CalendarDays, Layers } from '@/shared/icons';
import { getSchedules } from '@/services/adminScheduleService';
import { queryKeys } from '@/services/queryKeys';
import { ScheduleNameCell, UpdatedCell } from '../components/ScheduleCells';
import { ScheduleFilters } from '../components/ScheduleFilters';
import { useScheduleCatalogOptions, useScheduleListFilters } from '../hooks/useSchedules';
import { scheduleName } from '../utils/format';

const INITIAL_SORT = { key: 'updatedAt', direction: 'desc' };

/**
 * /admin/tasks — tasks always belong to one schedule version, so this page explains that and lists
 * the schedules with a shortcut to each version's task editor.
 */
export default function TasksIndexPage() {
  useDocumentTitle('Tasks');
  const navigate = useNavigate();
  const [filters, setFilters] = useScheduleListFilters();
  const options = useScheduleCatalogOptions();

  const columns = useMemo(
    () => [
      {
        key: 'designation.name',
        header: 'Schedule',
        sortable: true,
        cell: (row) => <ScheduleNameCell schedule={row} />,
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
        cell: (row) => (
          <Button
            as={Link}
            to={paths.adminScheduleTasks(row._id)}
            variant="outline"
            size="sm"
            rightIcon={ArrowRight}
            className="h-9"
            aria-label={`Manage tasks for ${scheduleName(row)}, version ${row.version}`}
          >
            Manage tasks
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Every task belongs to one version of a schedule. Pick a schedule to add, edit or reorder its tasks."
      />

      <StatusBanner variant="info" icon={Layers} title="Tasks follow their schedule version">
        Published versions are locked, so students keep the tasks they enrolled with. To change tasks,
        open a schedule and create a new draft.
      </StatusBanner>

      <DataTable
        caption="Schedules and their tasks"
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
        onRowClick={(row) => navigate(paths.adminScheduleTasks(row._id))}
        emptyState={{
          icon: CalendarDays,
          title: 'No schedules yet',
          description: 'Tasks live inside a schedule. Create a schedule first, then add its tasks.',
          action: (
            <Button as={Link} to={ROUTES.ADMIN_SCHEDULES} rightIcon={ArrowRight}>
              Go to schedules
            </Button>
          ),
        }}
      />
    </div>
  );
}
