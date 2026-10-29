import { useMemo, useState } from 'react';
import { Button, DataTable, Select, StatusBadge } from '@/shared/components/ui';
import { Briefcase, Building2, Plus } from '@/shared/icons';
import { PUBLISH_STATUS } from '@/shared/constants';
import { formatDate, formatDateTime } from '@/shared/utils/helpers';
import { getCatalogKind } from '../hooks/useCatalogAdmin';
import { CatalogRowActions } from './CatalogRowActions';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: PUBLISH_STATUS.PUBLISHED, label: 'Published' },
  { value: PUBLISH_STATUS.DRAFT, label: 'Draft' },
];

const KIND_ICONS = { designation: Briefcase, domain: Building2 };

const EMPTY_DESCRIPTIONS = {
  designation: 'Designations are the roles students apply for, such as Java Developer.',
  domain: 'Domains are the industries projects are set in, such as Banking or Healthcare.',
};

/**
 * KD3 list of designations or domains (server-paginated DataTable): name, slug, description,
 * status and last update, with Edit and Publish / Unpublish row actions.
 */
export function CatalogTable({ kind, onCreate, onEdit, onChangeStatus }) {
  const config = getCatalogKind(kind);
  const [status, setStatus] = useState('');

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        className: 'min-w-[10rem]',
        cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
      },
      {
        key: 'slug',
        header: 'Slug',
        cell: (row) => (
          <code className="whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            {row.slug}
          </code>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        className: 'min-w-[16rem] max-w-md',
        cell: (row) =>
          row.description ? (
            <p className="line-clamp-2 text-slate-600" title={row.description}>
              {row.description}
            </p>
          ) : (
            <span className="text-slate-500">—</span>
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
            itemLabel={row.name}
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
      fetcher={config.list}
      queryKey={config.queryKey}
      columns={columns}
      filters={{ status }}
      initialSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder={`Search ${config.plural}…`}
      caption={config.titlePlural}
      toolbar={
        <Select
          size="sm"
          aria-label="Filter by status"
          options={STATUS_FILTER_OPTIONS}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full sm:w-44"
        />
      }
      emptyState={{
        icon: KIND_ICONS[config.kind] ?? Briefcase,
        title: `No ${config.plural} yet`,
        description: EMPTY_DESCRIPTIONS[config.kind],
        action: onCreate ? (
          <Button leftIcon={Plus} onClick={onCreate}>
            Create {config.singular}
          </Button>
        ) : null,
      }}
    />
  );
}

export default CatalogTable;
