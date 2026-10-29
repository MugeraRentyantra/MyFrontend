import { useId } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from '@/shared/icons';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatNumber } from '@/shared/utils/helpers';
import { Button } from './Button';

// Prev/Next are icon-only 40px touch targets on phones, compact text buttons from sm.
const NAV_BUTTON_CLASSES = 'h-10 min-w-[2.5rem] px-2.5 sm:h-8 sm:min-w-0 sm:px-3';

/** [1, 'gap-1', 4, 5, 6, 'gap-6', 10]: first, last and current ±1, with ellipses for skipped runs. */
function getPageItems(current, totalPages) {
  const candidates = [1, current - 1, current, current + 1, totalPages].filter(
    (pageNumber) => pageNumber >= 1 && pageNumber <= totalPages,
  );
  const pages = Array.from(new Set(candidates)).sort((a, b) => a - b);
  const items = [];
  let previous = 0;
  pages.forEach((pageNumber) => {
    const gap = pageNumber - previous;
    if (gap === 2) items.push(previous + 1);
    else if (gap > 2) items.push(`gap-${previous}`);
    items.push(pageNumber);
    previous = pageNumber;
  });
  return items;
}

/**
 * Page navigation: "Showing 11–20 of 57", Previous/Next and numbered pages (numbers hidden below sm).
 * The "Rows per page" select is shown only when `onLimitChange` is given.
 */
export function Pagination({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  total = 0,
  onPageChange,
  onLimitChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
  ...rest
}) {
  const selectId = useId();
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_PAGE_SIZE);
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));
  const current = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const from = safeTotal === 0 ? 0 : (current - 1) * safeLimit + 1;
  const to = Math.min(safeTotal, current * safeLimit);
  const baseOptions = pageSizeOptions?.length ? pageSizeOptions : PAGE_SIZE_OPTIONS;
  const sizeOptions = Array.from(new Set([...baseOptions.map(Number), safeLimit])).sort(
    (a, b) => a - b,
  );
  const pageItems = getPageItems(current, totalPages);

  const goTo = (target) => {
    if (target < 1 || target > totalPages || target === current) return;
    onPageChange?.(target);
  };

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="tabular text-sm text-slate-600" aria-live="polite">
          Showing <span className="font-medium text-slate-900">{formatNumber(from)}</span>–
          <span className="font-medium text-slate-900">{formatNumber(to)}</span> of{' '}
          <span className="font-medium text-slate-900">{formatNumber(safeTotal)}</span>
        </p>

        {onLimitChange ? (
          <div className="flex items-center gap-2">
            <label htmlFor={selectId} className="whitespace-nowrap text-sm text-slate-500">
              Rows per page
            </label>
            <div className="relative">
              <select
                id={selectId}
                value={safeLimit}
                onChange={(event) => onLimitChange(Number(event.target.value))}
                className="tabular h-10 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white py-0 pl-3 pr-8 text-sm text-slate-700 shadow-sm transition-colors duration-150 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 sm:h-8"
              >
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex w-full items-center justify-between gap-1 sm:w-auto sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          leftIcon={ChevronLeft}
          onClick={() => goTo(current - 1)}
          disabled={current <= 1}
          aria-label="Previous page"
          className={NAV_BUTTON_CLASSES}
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <ul className="hidden items-center gap-1 sm:flex">
          {pageItems.map((item) =>
            typeof item === 'number' ? (
              <li key={item}>
                <Button
                  variant={item === current ? 'primary' : 'ghost'}
                  size="sm"
                  className="tabular min-w-[2rem] px-2"
                  aria-label={`Page ${item}`}
                  aria-current={item === current ? 'page' : undefined}
                  onClick={() => goTo(item)}
                >
                  {item}
                </Button>
              </li>
            ) : (
              <li key={item} className="px-1 text-sm text-slate-400" aria-hidden="true">
                …
              </li>
            ),
          )}
        </ul>

        <span className="tabular px-2 text-sm text-slate-600 sm:hidden">
          Page {current} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          rightIcon={ChevronRight}
          onClick={() => goTo(current + 1)}
          disabled={current >= totalPages}
          aria-label="Next page"
          className={NAV_BUTTON_CLASSES}
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>
    </nav>
  );
}

export default Pagination;
