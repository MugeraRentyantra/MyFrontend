import { useMemo, useState } from 'react';
import { Badge, DataTable, PageHeader } from '@/shared/components/ui';
import { History } from '@/shared/icons';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useDocumentTitle } from '@/shared/hooks';
import { formatDateTime, formatRelativeTime, shortId } from '@/shared/utils/helpers';
import { AuditLogDrawer } from '../components/AuditLogDrawer';
import { ClearFiltersButton } from '../components/ClearFiltersButton';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { FilterSelect } from '../components/FilterSelect';
import { PersonCell } from '../components/PersonCell';
import { AUDIT_ACTION_OPTIONS } from '../constants';
import { fetchAuditLogs, useAuditActorOptions } from '../hooks/useAuditLogs';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { changedAuditKeys, entityTypeLabel } from '../utils/format';

const FILTER_KEYS = ['action', 'actorId', 'from', 'to'];
const INITIAL_SORT = { key: 'createdAt', direction: 'desc' };
const MAX_KEYS_SHOWN = 3;

function ChangesCell({ entry }) {
  const keys = changedAuditKeys(entry.before, entry.after);
  if (keys.length === 0) return <span className="text-sm text-slate-500">—</span>;
  const shown = keys.slice(0, MAX_KEYS_SHOWN);
  const extra = keys.length - shown.length;
  return (
    <span className="block max-w-[14rem] truncate font-mono text-xs text-slate-600" title={keys.join(', ')}>
      {shown.join(', ')}
      {extra > 0 ? ` +${extra}` : ''}
    </span>
  );
}

const COLUMNS = [
  {
    key: 'createdAt',
    header: 'Time',
    sortable: true,
    cell: (entry) => (
      <div className="whitespace-nowrap">
        <time dateTime={entry.createdAt} className="block text-slate-900">
          {formatDateTime(entry.createdAt)}
        </time>
        <span className="block text-xs text-slate-500">{formatRelativeTime(entry.createdAt)}</span>
      </div>
    ),
  },
  {
    key: 'actor',
    header: 'Actor',
    cell: (entry) =>
      entry.actor ? (
        <PersonCell person={entry.actor} avatarSize="xs" />
      ) : (
        <span className="text-sm text-slate-500">System</span>
      ),
  },
  {
    key: 'action',
    header: 'Action',
    cell: (entry) => (
      <Badge variant="neutral" className="font-mono">
        {entry.action}
      </Badge>
    ),
  },
  {
    key: 'entityType',
    header: 'Entity',
    cell: (entry) => (
      <span className="whitespace-nowrap">
        <span className="text-slate-700">{entityTypeLabel(entry.entityType)}</span>
        {entry.entityId ? (
          <span className="ml-1.5 font-mono text-xs text-slate-500" title={entry.entityId}>
            #{shortId(entry.entityId)}
          </span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'changes',
    header: 'Changed fields',
    cell: (entry) => <ChangesCell entry={entry} />,
  },
];

/** GP13 append-only audit log: who changed what and when, with a before/after diff per entry. */
export function AuditLogPage() {
  useDocumentTitle('Audit log');
  const { values, setValue, setValues, clear, activeCount } = useUrlFilters(FILTER_KEYS);
  const [selected, setSelected] = useState(null);
  const actors = useAuditActorOptions();

  const filters = useMemo(
    () => ({ action: values.action, actorId: values.actorId, from: values.from, to: values.to }),
    [values.action, values.actorId, values.from, values.to],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every admin change, newest first. Entries cannot be edited or deleted. Select a row to compare before and after."
      />

      <DataTable
        fetcher={fetchAuditLogs}
        queryKey={queryKeys.admin.audit}
        filters={filters}
        columns={COLUMNS}
        initialSort={INITIAL_SORT}
        searchPlaceholder="Search action, entity or actor…"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Audit log"
        onRowClick={(entry) => setSelected(entry)}
        rowClassName={(entry) => (selected && entry._id === selected._id ? 'bg-brand-50/60' : undefined)}
        toolbar={
          <>
            <FilterSelect
              label="Filter by action"
              allLabel="All actions"
              value={values.action}
              onChange={(value) => setValue('action', value)}
              options={AUDIT_ACTION_OPTIONS}
              className="sm:w-52"
            />
            <FilterSelect
              label="Filter by actor"
              allLabel={actors.isLoading ? 'Loading admins…' : 'All admins'}
              value={values.actorId}
              onChange={(value) => setValue('actorId', value)}
              options={actors.data ?? []}
            />
            <DateRangeFilter
              label="Date"
              from={values.from}
              to={values.to}
              onChange={({ from, to }) => setValues({ from, to })}
            />
            <ClearFiltersButton count={activeCount} onClear={() => clear()} />
          </>
        }
        emptyState={{
          icon: History,
          title: 'No audit entries yet',
          description: 'Changes made by admins (roles, catalog, prices, schedules) are recorded here.',
        }}
      />

      <AuditLogDrawer log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

export default AuditLogPage;
