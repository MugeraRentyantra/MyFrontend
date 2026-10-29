import { useMemo, useState } from 'react';
import { Badge, DataTable, ProgressBar, Select } from '@/shared/components/ui';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { AlertTriangle, Users } from '@/shared/icons';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { INACTIVE_AFTER_DAYS, isTeamItem } from '../utils/reviewHelpers';
import { OwnerCell } from './OwnerCell';

const SHOW_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'inactive', label: `Inactive (${INACTIVE_AFTER_DAYS}+ days)` },
  { value: 'pending', label: 'Waiting for review' },
];

const FILTERS = {
  all: {},
  inactive: { inactive: 'yes' },
  pending: { hasPending: 'yes' },
};

/**
 * KD13 progress report: one row per assigned student or team with approved/total, pending reviews and
 * last activity. Sorted by last activity (oldest first) so inactive students surface at the top.
 * Pass rows already mapped with `toReportRow` (utils/reviewHelpers) plus the query state.
 */
export function ProgressReportTable({ rows, loading, error, onRetry }) {
  const [show, setShow] = useState('all');

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Student or team',
        sortable: true,
        className: 'min-w-[14rem]',
        cell: (row) => (
          <OwnerCell
            item={row}
            secondary={isTeamItem(row) ? 'Team' : row.email || 'Individual'}
          />
        ),
      },
      {
        key: 'planLabel',
        header: 'Internship',
        sortable: true,
        className: 'min-w-[12rem] text-slate-600',
        cell: (row) => row.planLabel || <span className="text-slate-500">—</span>,
      },
      {
        key: 'completion',
        header: 'Approved',
        sortable: true,
        className: 'min-w-[11rem]',
        cell: (row) => (
          <div className="w-40">
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="tabular text-slate-700">
                {row.approved}/{row.total} tasks
              </span>
              <span className="tabular font-medium text-slate-900">{row.completion}%</span>
            </div>
            <ProgressBar
              value={row.approved}
              max={row.total || 1}
              size="sm"
              variant={row.total > 0 && row.approved >= row.total ? 'success' : 'brand'}
              aria-label={`${row.name}: ${row.approved} of ${row.total} tasks approved`}
              aria-valuetext={`${row.completion}%`}
            />
          </div>
        ),
      },
      {
        key: 'pending',
        header: 'To review',
        sortable: true,
        align: 'right',
        cell: (row) =>
          row.pending > 0 ? (
            <Badge variant="brand">
              <span className="tabular">{row.pending}</span> pending
            </Badge>
          ) : (
            <span className="tabular text-slate-500">0</span>
          ),
      },
      {
        key: 'lastActivityTime',
        header: 'Last activity',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-2">
            {row.lastActivityAt ? (
              <time dateTime={row.lastActivityAt} title={formatDateTime(row.lastActivityAt)}>
                {formatRelativeTime(row.lastActivityAt)}
              </time>
            ) : (
              <span className="text-slate-500">No activity yet</span>
            )}
            {row.inactive === 'yes' ? (
              <Badge variant="warning" icon={AlertTriangle}>
                Inactive
              </Badge>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      loading={loading}
      error={error}
      onRetry={onRetry}
      searchKeys={['name', 'email', 'planLabel', 'team.name']}
      searchPlaceholder="Search student, team or internship…"
      filters={FILTERS[show]}
      initialSort={{ key: 'lastActivityTime', direction: 'asc' }}
      pageSize={10}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      caption="Progress of your assigned students and teams"
      toolbar={
        <Select
          size="sm"
          aria-label="Show"
          value={show}
          onChange={(event) => setShow(event.target.value)}
          options={SHOW_OPTIONS}
          className="w-full sm:w-52"
        />
      }
      emptyState={{
        icon: Users,
        title: 'No students assigned yet',
        description:
          "An admin assigns students and teams to you. Their progress will be reported here.",
      }}
    />
  );
}

export default ProgressReportTable;
