import { Button, Select } from '@/shared/components/ui';
import { SCHEDULE_STATUS, getStatusMeta } from '@/shared/constants';
import { X } from '@/shared/icons';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.values(SCHEDULE_STATUS).map((status) => ({
    value: status,
    label: getStatusMeta(status).label,
  })),
];

/**
 * Designation / domain / status filters for schedule lists (rendered in the DataTable toolbar).
 * `value` = { designationId, domainId, status }; `onChange(nextValue)`.
 */
export function ScheduleFilters({ value, onChange, designations = [], domains = [], loading = false }) {
  const filters = value ?? {};
  const hasFilters = Boolean(filters.designationId || filters.domainId || filters.status);
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <>
      <Select
        aria-label="Filter by designation"
        className="w-full sm:w-48"
        value={filters.designationId ?? ''}
        onChange={(event) => update({ designationId: event.target.value })}
        disabled={loading && designations.length === 0}
        options={[{ value: '', label: 'All designations' }, ...designations]}
      />
      <Select
        aria-label="Filter by domain"
        className="w-full sm:w-44"
        value={filters.domainId ?? ''}
        onChange={(event) => update({ domainId: event.target.value })}
        disabled={loading && domains.length === 0}
        options={[{ value: '', label: 'All domains' }, ...domains]}
      />
      <Select
        aria-label="Filter by status"
        className="w-full sm:w-36"
        value={filters.status ?? ''}
        onChange={(event) => update({ status: event.target.value })}
        options={STATUS_OPTIONS}
      />
      {hasFilters ? (
        <Button
          variant="ghost"
          leftIcon={X}
          onClick={() => onChange({ designationId: '', domainId: '', status: '' })}
        >
          Clear filters
        </Button>
      ) : null}
    </>
  );
}

export default ScheduleFilters;
