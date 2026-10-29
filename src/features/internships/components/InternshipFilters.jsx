import { Button, SearchBar, Select } from '@/shared/components/ui';
import { DURATION_OPTIONS } from '@/shared/constants';
import { X } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDuration } from '@/shared/utils/helpers';

const DURATION_SELECT_OPTIONS = [
  { value: '', label: 'Any duration' },
  ...DURATION_OPTIONS.map((months) => ({ value: String(months), label: formatDuration(months) })),
];

/**
 * Catalog filter bar (SN5): search, domain and duration. Fully controlled; the catalog page
 * keeps the values in the URL search params.
 */
export function InternshipFilters({
  search = '',
  onSearchChange,
  domainId = '',
  onDomainChange,
  duration = '',
  onDurationChange,
  domains = [],
  domainsLoading = false,
  hasFilters = false,
  onClear,
  className,
}) {
  const domainOptions = [
    { value: '', label: domainsLoading && domains.length === 0 ? 'Loading domains…' : 'All domains' },
    ...domains.map((domain) => ({ value: domain._id, label: domain.name })),
  ];

  return (
    <div
      role="search"
      aria-label="Filter internships"
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-3 shadow-card sm:p-4',
        className,
      )}
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem] md:items-center">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search by role or skill…"
          aria-label="Search internships"
        />
        <Select
          aria-label="Filter by domain"
          value={domainId}
          onChange={(event) => onDomainChange?.(event.target.value)}
          options={domainOptions}
        />
        <Select
          aria-label="Filter by duration"
          value={duration}
          onChange={(event) => onDurationChange?.(event.target.value)}
          options={DURATION_SELECT_OPTIONS}
        />
      </div>
      {hasFilters && onClear ? (
        <div className="mt-3 flex justify-end md:hidden">
          <Button variant="ghost" size="sm" leftIcon={X} onClick={onClear}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default InternshipFilters;
