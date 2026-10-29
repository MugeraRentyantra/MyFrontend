import { useEffect, useId, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Search } from '@/shared/icons';
import { DEFAULT_PAGE_SIZE } from '@/shared/constants';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { cn } from '@/shared/utils/cn';
import { cleanParams, humanize } from '@/shared/utils/helpers';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { Pagination } from './Pagination';
import { SearchBar } from './SearchBar';

const EMPTY_ROWS = [];

const ALIGN = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5'];

// Clicks that start on these elements inside a row never trigger onRowClick.
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="tab"], [data-row-click-ignore]';

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Reads `row.a.b` for "a.b"; plain keys are read directly. */
function readPath(row, path) {
  if (row === null || row === undefined || path === undefined || path === null) return undefined;
  if (typeof path !== 'string' || !path.includes('.')) return row[path];
  return path
    .split('.')
    .reduce((value, key) => (value === null || value === undefined ? undefined : value[key]), row);
}

function isBlank(value) {
  return value === undefined || value === null || value === '';
}

function renderPlainValue(value) {
  if (isBlank(value)) return <span className="text-slate-500">—</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : <span className="text-slate-500">—</span>;
  if (typeof value === 'object') return <span className="text-slate-500">—</span>;
  return value;
}

function resolveRowKey(rowKey, row, index) {
  if (typeof rowKey === 'function') return rowKey(row, index);
  const value = readPath(row, rowKey);
  return value === undefined || value === null ? index : value;
}

function matchesFilter(value, expected) {
  if (Array.isArray(expected)) return expected.map(String).includes(String(value));
  if (Array.isArray(value)) return value.map(String).includes(String(expected));
  return String(value) === String(expected);
}

function rowMatchesSearch(row, needle, keys) {
  const fields = keys && keys.length ? keys : Object.keys(row ?? {});
  return fields.some((key) => {
    const value = readPath(row, key);
    if (Array.isArray(value)) {
      return value.some(
        (entry) => typeof entry !== 'object' && String(entry).toLowerCase().includes(needle),
      );
    }
    if (value === null || value === undefined || typeof value === 'object') return false;
    return String(value).toLowerCase().includes(needle);
  });
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/** Stable sort; blank values always go last regardless of direction. */
function sortRows(rows, getValue, direction) {
  const factor = direction === 'desc' ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, value: getValue(row) }))
    .sort((x, y) => {
      const xBlank = isBlank(x.value);
      const yBlank = isBlank(y.value);
      if (xBlank || yBlank) {
        if (xBlank && yBlank) return x.index - y.index;
        return xBlank ? 1 : -1;
      }
      const result = compareValues(x.value, y.value);
      return result === 0 ? x.index - y.index : result * factor;
    })
    .map((entry) => entry.row);
}

/** True when the event should not activate the row (nested controls, portalled content, text selection). */
function shouldIgnoreRowEvent(event) {
  const row = event.currentTarget;
  const target = event.target;
  if (!(target instanceof Element) || !row.contains(target)) return true;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return Boolean(interactive && interactive !== row && row.contains(interactive));
}

function hasTextSelection() {
  if (typeof window === 'undefined' || !window.getSelection) return false;
  const selection = window.getSelection();
  return Boolean(selection && selection.type === 'Range' && selection.toString().trim().length > 0);
}

// ---------------------------------------------------------------------------
// Shared state: search, paging, sorting
// ---------------------------------------------------------------------------

function normaliseSort(sort) {
  if (!sort || !sort.key) return null;
  return { key: sort.key, direction: sort.direction === 'desc' ? 'desc' : 'asc' };
}

function useTableControls({ pageSize, initialSort, filters }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const appliedSearch = debouncedSearch.trim();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(() => Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));
  const [sort, setSort] = useState(() => normaliseSort(initialSort));

  const filtersKey = JSON.stringify(filters ?? {});

  // A new search or new filters always start again at page 1 (adjusted during render, so no request is
  // ever made for the old page with the new criteria).
  const signature = `${appliedSearch}\u0000${filtersKey}`;
  const [previousSignature, setPreviousSignature] = useState(signature);
  if (previousSignature !== signature) {
    setPreviousSignature(signature);
    setPage(1);
  }

  const activeFilters = useMemo(() => cleanParams(JSON.parse(filtersKey)), [filtersKey]);

  const toggleSort = (key) => {
    setSort((current) =>
      current && current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
    setPage(1);
  };

  const changeLimit = (nextLimit) => {
    setLimit(Math.max(1, Number(nextLimit) || DEFAULT_PAGE_SIZE));
    setPage(1);
  };

  return {
    search,
    setSearch,
    appliedSearch,
    page,
    setPage,
    limit,
    changeLimit,
    sort,
    toggleSort,
    filtersKey,
    activeFilters,
  };
}

// ---------------------------------------------------------------------------
// Presentational table
// ---------------------------------------------------------------------------

function DataTableView({
  columns = [],
  rows,
  total,
  controls,
  pageSizeOptions,
  searchable = true,
  searchPlaceholder = 'Search…',
  toolbar,
  caption,
  onRowClick,
  rowKey = '_id',
  rowClassName,
  emptyState,
  isLoading,
  isRefreshing,
  error,
  hasData,
  onRetry,
  className,
  ...rest
}) {
  const {
    search,
    setSearch,
    appliedSearch,
    page,
    setPage,
    limit,
    changeLimit,
    sort,
    toggleSort,
    activeFilters,
  } = controls;
  const hasToolbar = searchable || Boolean(toolbar);
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const isClickable = typeof onRowClick === 'function';
  const showError = Boolean(error) && !hasData;
  const showRefreshError = Boolean(error) && hasData;
  const showEmpty = !showError && !isLoading && rows.length === 0;
  const showTable = !showError && !showEmpty;
  const showPagination = showTable && !isLoading && total > 0;
  const searchLabel = String(searchPlaceholder || 'Search').replace(/[.…\s]+$/, '') || 'Search';

  const handleRowClick = (event, row) => {
    if (shouldIgnoreRowEvent(event) || hasTextSelection()) return;
    onRowClick(row);
  };

  const handleRowKeyDown = (event, row) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  let resultsMessage = '';
  if (!isLoading && !isRefreshing && !showError && (appliedSearch || hasActiveFilters)) {
    resultsMessage = total === 1 ? '1 result' : `${total} results`;
  }

  let emptyContent = null;
  if (showEmpty) {
    if (appliedSearch || hasActiveFilters) {
      const hint = appliedSearch
        ? `Nothing matches “${appliedSearch}”. Try a different search${hasActiveFilters ? ' or change the filters' : ''}.`
        : 'Nothing matches the current filters. Try changing them.';
      emptyContent = (
        <EmptyState
          compact
          icon={Search}
          title="No matching results"
          description={hint}
          action={
            appliedSearch ? (
              <Button variant="outline" size="sm" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : null
          }
        />
      );
    } else {
      emptyContent = (
        <EmptyState
          compact
          icon={emptyState?.icon ?? Inbox}
          title={emptyState?.title ?? 'Nothing here yet'}
          description={emptyState?.description}
          action={emptyState?.action}
        />
      );
    }
  }

  return (
    <div
      className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card', className)}
      {...rest}
    >
      {hasToolbar ? (
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {searchable ? (
            <div className="w-full sm:max-w-xs">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={searchPlaceholder}
                aria-label={searchLabel}
                className="w-full"
              />
              <p className="sr-only" aria-live="polite">
                {resultsMessage}
              </p>
            </div>
          ) : (
            <span className="hidden sm:block" />
          )}
          {toolbar ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">{toolbar}</div>
          ) : null}
        </div>
      ) : null}

      {showRefreshError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700"
        >
          <span>We couldn't refresh this list. Showing the last loaded data.</span>
          {onRetry ? (
            <button
              type="button"
              onClick={() => onRetry()}
              className="rounded font-medium underline underline-offset-4 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {showError ? (
        <div className="px-4 py-6 sm:px-6">
          <ErrorState error={error} onRetry={onRetry ? () => onRetry() : undefined} compact />
        </div>
      ) : null}

      {showEmpty ? <div className="px-4 py-6 sm:px-6">{emptyContent}</div> : null}

      {showTable ? (
        <div
          className="scrollbar-thin overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
          tabIndex={0}
          role={caption ? 'region' : undefined}
          aria-label={caption || undefined}
        >
          <table className="min-w-full text-sm" aria-busy={isLoading || isRefreshing || undefined}>
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column, columnIndex) => {
                  const sortKey = column.sortKey ?? column.key;
                  const isSorted = Boolean(column.sortable && sort && sort.key === sortKey);
                  const SortIcon = !isSorted ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                  const hasHeader = !isBlank(column.header);
                  const headerContent = hasHeader ? (
                    column.header
                  ) : (
                    <span className="sr-only">{humanize(column.key) || 'Column'}</span>
                  );
                  let ariaSort;
                  if (column.sortable) {
                    ariaSort = isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                  }
                  return (
                    <th
                      key={column.key ?? columnIndex}
                      scope="col"
                      aria-sort={ariaSort}
                      style={column.width ? { width: column.width } : undefined}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 font-semibold',
                        ALIGN[column.align] ?? ALIGN.left,
                        column.headerClassName,
                      )}
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(sortKey)}
                          className={cn(
                            '-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-semibold uppercase tracking-wide transition-colors duration-150 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                            isSorted && 'text-slate-900',
                            column.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          <span>{headerContent}</span>
                          <SortIcon
                            className={cn('h-3.5 w-3.5 shrink-0', isSorted ? 'text-slate-700' : 'text-slate-400')}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        headerContent
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {isLoading ? (
              <tbody className="divide-y divide-slate-100" aria-hidden="true">
                {Array.from({ length: Math.min(limit, 6) }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`}>
                    {columns.map((column, columnIndex) => (
                      <td key={column.key ?? columnIndex} className="px-4 py-3.5">
                        <div
                          className={cn(
                            'h-4 max-w-[12rem] animate-pulse rounded bg-slate-200/80',
                            SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length],
                            column.align === 'right' && 'ml-auto',
                            column.align === 'center' && 'mx-auto',
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody
                className={cn(
                  'divide-y divide-slate-100 transition-opacity duration-150',
                  isRefreshing && 'opacity-60',
                )}
              >
                {rows.map((row, rowIndex) => {
                  const extraRowClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
                  return (
                    <tr
                      key={resolveRowKey(rowKey, row, rowIndex)}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={isClickable ? (event) => handleRowClick(event, row) : undefined}
                      onKeyDown={isClickable ? (event) => handleRowKeyDown(event, row) : undefined}
                      className={cn(
                        'transition-colors duration-150 hover:bg-slate-50',
                        isClickable &&
                          'cursor-pointer focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:[outline-offset:-2px]',
                        extraRowClass,
                      )}
                    >
                      {columns.map((column, columnIndex) => (
                        <td
                          key={column.key ?? columnIndex}
                          className={cn(
                            'px-4 py-3 align-middle text-slate-700',
                            ALIGN[column.align] ?? ALIGN.left,
                            column.className,
                          )}
                        >
                          {typeof column.cell === 'function'
                            ? column.cell(row, rowIndex)
                            : renderPlainValue(readPath(row, column.key))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
          {isLoading ? <span className="sr-only">Loading…</span> : null}
        </div>
      ) : null}

      {showPagination ? (
        <div className="border-t border-slate-200 px-4 py-3">
          <Pagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={pageSizeOptions?.length ? changeLimit : undefined}
            pageSizeOptions={pageSizeOptions}
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data modes
// ---------------------------------------------------------------------------

function ServerDataTable({ fetcher, queryKey, queryOptions, filters, pageSize, initialSort, ...viewProps }) {
  const controls = useTableControls({ pageSize, initialSort, filters });
  const { page, setPage, limit, sort, appliedSearch, filtersKey } = controls;
  const fallbackKey = useId();

  const params = useMemo(
    () =>
      cleanParams({
        page,
        limit,
        search: appliedSearch || undefined,
        sort: sort ? `${sort.key}:${sort.direction}` : undefined,
        ...JSON.parse(filtersKey),
      }),
    [page, limit, appliedSearch, sort, filtersKey],
  );

  let keyPrefix = ['data-table', fallbackKey];
  if (Array.isArray(queryKey)) keyPrefix = queryKey;
  else if (queryKey !== undefined && queryKey !== null) keyPrefix = [queryKey];

  const query = useQuery({
    queryKey: [...keyPrefix, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,
    ...queryOptions,
  });

  const result = query.data;
  let rows = EMPTY_ROWS;
  if (Array.isArray(result)) rows = result;
  else if (Array.isArray(result?.items)) rows = result.items;
  const total = Array.isArray(result) ? result.length : Math.max(0, Number(result?.total ?? rows.length) || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasData = result !== undefined;

  // After a deletion the current page can fall past the end: step back to the last page that exists.
  useEffect(() => {
    if (hasData && !query.isPlaceholderData && total > 0 && page > totalPages) setPage(totalPages);
  }, [hasData, query.isPlaceholderData, total, page, totalPages, setPage]);

  return (
    <DataTableView
      {...viewProps}
      rows={rows}
      total={total}
      controls={controls}
      isLoading={query.isPending}
      isRefreshing={query.isFetching && !query.isPending}
      error={query.isError ? query.error : null}
      hasData={hasData}
      onRetry={query.refetch}
    />
  );
}

function ClientDataTable({
  data,
  searchKeys,
  loading = false,
  error = null,
  onRetry,
  filters,
  pageSize,
  initialSort,
  columns = [],
  ...viewProps
}) {
  const controls = useTableControls({ pageSize, initialSort, filters });
  const { page, limit, sort, appliedSearch, activeFilters } = controls;
  const allRows = Array.isArray(data) ? data : EMPTY_ROWS;
  const hasData = Array.isArray(data);

  const processed = useMemo(() => {
    let result = allRows;
    const filterEntries = Object.entries(activeFilters);
    if (filterEntries.length) {
      result = result.filter((row) =>
        filterEntries.every(([key, expected]) => matchesFilter(readPath(row, key), expected)),
      );
    }
    if (appliedSearch) {
      const needle = appliedSearch.toLowerCase();
      result = result.filter((row) => rowMatchesSearch(row, needle, searchKeys));
    }
    if (sort) {
      const column = columns.find((item) => (item.sortKey ?? item.key) === sort.key);
      const getValue =
        typeof column?.sortValue === 'function' ? column.sortValue : (row) => readPath(row, sort.key);
      result = sortRows(result, getValue, sort.direction);
    }
    return result;
  }, [allRows, activeFilters, appliedSearch, searchKeys, sort, columns]);

  const total = processed.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, totalPages);
  const rows = processed.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <DataTableView
      {...viewProps}
      columns={columns}
      rows={rows}
      total={total}
      controls={{ ...controls, page: currentPage }}
      isLoading={Boolean(loading) && !hasData}
      isRefreshing={Boolean(loading) && hasData}
      error={error}
      hasData={hasData}
      onRetry={onRetry}
    />
  );
}

/**
 * KD1 DataTable, reused by every admin/trainer list.
 *
 * Server mode: `fetcher(params) => Promise<{ items, page, limit, total }>` + `queryKey` (array prefix). Params are
 *   `{ page, limit, search, sort: 'key:asc|desc', ...filters }` (empty values removed) and the query key is
 *   `[...queryKey, params]`, so invalidating the prefix refreshes the table.
 * Client mode: `data` (array) + `searchKeys` (dotted paths ok). Filters match row fields exactly. Optional
 *   `loading`, `error`, `onRetry` describe how `data` is being loaded.
 * Columns: [{ key, header, cell(row, index), className, headerClassName, align, sortable, sortKey, sortValue, width }].
 */
export function DataTable({
  fetcher,
  queryKey,
  queryOptions,
  data,
  searchKeys,
  loading,
  error,
  onRetry,
  ...common
}) {
  if (typeof fetcher === 'function') {
    return <ServerDataTable fetcher={fetcher} queryKey={queryKey} queryOptions={queryOptions} {...common} />;
  }
  return (
    <ClientDataTable
      data={data}
      searchKeys={searchKeys}
      loading={loading}
      error={error}
      onRetry={onRetry}
      {...common}
    />
  );
}

export default DataTable;
