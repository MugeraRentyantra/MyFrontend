import { useMemo, useState } from 'react';
import { Button, DataTable, Select, StatusBadge } from '@/shared/components/ui';
import { IndianRupee, Plus, X } from '@/shared/icons';
import { PUBLISH_STATUS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { formatDate, formatDateTime, formatDuration, formatMoney } from '@/shared/utils/helpers';
import { useCatalogOptions } from '../hooks/useCatalogAdmin';
import { fetchAdminPlans } from '../hooks/useEmployerInternships';
import { CatalogRowActions } from './CatalogRowActions';

const EMPTY_FILTERS = Object.freeze({ designationId: '', domainId: '', status: '' });

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: PUBLISH_STATUS.PUBLISHED, label: 'Published' },
  { value: PUBLISH_STATUS.DRAFT, label: 'Draft' },
];

function filterOptions(items, allLabel) {
  return [
    { value: '', label: allLabel },
    ...(items ?? []).map((item) => ({
      value: item._id,
      label: item.status === PUBLISH_STATUS.PUBLISHED ? item.name : `${item.name} (draft)`,
    })),
  ];
}

export function describePlan(plan) {
  return [plan.designation?.name, plan.domain?.name, formatDuration(plan.durationMonths)]
    .filter(Boolean)
    .join(', ');
}

/**
 * KD4 plans table (server-paginated): designation, domain, duration, base price, status, updated.
 * Filters: designation, domain and status. Row actions: Edit plan, Publish / Unpublish.
 */
export function PlansTable({ onCreate, onEdit, onChangeStatus }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const designationsQuery = useCatalogOptions('designation');
  const domainsQuery = useCatalogOptions('domain');

  const designationOptions = useMemo(
    () => filterOptions(designationsQuery.data, 'All designations'),
    [designationsQuery.data],
  );
  const domainOptions = useMemo(() => filterOptions(domainsQuery.data, 'All domains'), [domainsQuery.data]);
  const hasFilters = Boolean(filters.designationId || filters.domainId || filters.status);

  const setFilter = (key) => (event) => {
    const { value } = event.target;
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const columns = useMemo(
    () => [
      {
        key: 'designation',
        header: 'Designation',
        sortable: true,
        sortKey: 'designation.name',
        className: 'min-w-[10rem]',
        cell: (row) => <span className="font-medium text-slate-900">{row.designation?.name ?? '—'}</span>,
      },
      {
        key: 'domain',
        header: 'Domain',
        sortable: true,
        sortKey: 'domain.name',
        className: 'whitespace-nowrap',
        cell: (row) => row.domain?.name ?? <span className="text-slate-500">—</span>,
      },
      {
        key: 'durationMonths',
        header: 'Duration',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (row) => formatDuration(row.durationMonths),
      },
      {
        key: 'basePrice',
        header: 'Base price',
        sortable: true,
        align: 'right',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span className="tabular font-medium text-slate-900">{formatMoney(row.basePrice, row.currency)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'updatedAt',
        header: 'Updated',
        sortable: true,
        className: 'whitespace-nowrap',
        cell: (row) =>
          row.updatedAt ? (
            <time dateTime={row.updatedAt} title={formatDateTime(row.updatedAt)} className="text-slate-600">
              {formatDate(row.updatedAt)}
            </time>
          ) : (
            <span className="text-slate-500">—</span>
          ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <CatalogRowActions
            itemLabel={`plan ${describePlan(row)}`}
            status={row.status}
            onEdit={() => onEdit(row)}
            onChangeStatus={(nextStatus) => onChangeStatus(row, nextStatus)}
          />
        ),
      },
    ],
    [onEdit, onChangeStatus],
  );

  return (
    <DataTable
      fetcher={fetchAdminPlans}
      queryKey={queryKeys.admin.plans}
      columns={columns}
      filters={filters}
      searchPlaceholder="Search plans…"
      caption="Internship plans"
      toolbar={
        <>
          <Select
            size="sm"
            aria-label="Filter by designation"
            options={designationOptions}
            value={filters.designationId}
            onChange={setFilter('designationId')}
            className="w-full sm:w-48"
          />
          <Select
            size="sm"
            aria-label="Filter by domain"
            options={domainOptions}
            value={filters.domainId}
            onChange={setFilter('domainId')}
            className="w-full sm:w-40"
          />
          <Select
            size="sm"
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={filters.status}
            onChange={setFilter('status')}
            className="w-full sm:w-36"
          />
          {hasFilters ? (
            <Button variant="ghost" size="sm" leftIcon={X} onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters
            </Button>
          ) : null}
        </>
      }
      emptyState={{
        icon: IndianRupee,
        title: 'No plans yet',
        description: 'A plan combines a designation, a domain and a duration with a base price.',
        action: onCreate ? (
          <Button leftIcon={Plus} onClick={onCreate}>
            Create plan
          </Button>
        ) : null,
      }}
    />
  );
}

export default PlansTable;
