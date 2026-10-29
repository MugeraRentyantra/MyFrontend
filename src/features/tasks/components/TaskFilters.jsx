import { Tabs } from '@/shared/components/ui';
import { LayoutGrid, ListChecks } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { TASK_VIEWS } from '../hooks/useTaskBoardView';
import { STATUS_FILTERS, STATUS_FILTER_ALL } from '../utils/taskActions';

const VIEW_OPTIONS = [
  { value: TASK_VIEWS.BOARD, label: 'Board', icon: LayoutGrid },
  { value: TASK_VIEWS.LIST, label: 'List', icon: ListChecks },
];

function ViewToggle({ view, onChange }) {
  return (
    <div
      role="group"
      aria-label="Layout"
      className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = view === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Status filter pills with counts (synced to ?status= by the page) and, from lg, the
 * board/list layout switch.
 */
export function TaskFilters({ value, onChange, counts = {}, total = 0, view, onViewChange, className }) {
  const items = STATUS_FILTERS.map((filter) => ({
    value: filter.value,
    label: filter.label,
    count: filter.value === STATUS_FILTER_ALL ? total : (counts[filter.value] ?? 0),
  }));

  return (
    <div
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <Tabs
        items={items}
        value={value}
        onChange={onChange}
        variant="pills"
        aria-label="Filter tasks by status"
        className="min-w-0"
      />
      {onViewChange ? <ViewToggle view={view} onChange={onViewChange} /> : null}
    </div>
  );
}

export default TaskFilters;
