import { NavLink } from 'react-router-dom';
import { paths } from '@/shared/constants';
import { CalendarDays, ListChecks } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * Days | Tasks navigation for one schedule version. These are links between two routes (not an
 * in-page tablist), so the active one carries aria-current="page".
 */
export function ScheduleTabs({ scheduleId, daysCount, tasksCount, className }) {
  const items = [
    { label: 'Days', to: paths.adminSchedule(scheduleId), icon: CalendarDays, count: daysCount },
    { label: 'Tasks', to: paths.adminScheduleTasks(scheduleId), icon: ListChecks, count: tasksCount },
  ];

  return (
    <nav aria-label="Schedule sections" className={cn('scrollbar-thin overflow-x-auto', className)}>
      <ul className="flex gap-6 shadow-[inset_0_-1px_0_0_#e2e8f0]">
        {items.map((item) => {
          const Icon = item.icon;
          const hasCount = typeof item.count === 'number' && Number.isFinite(item.count);
          return (
            <li key={item.label} className="shrink-0">
              <NavLink
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 whitespace-nowrap rounded-t-md border-b-2 px-1 pb-3 pt-2 text-sm font-medium transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                    isActive
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                    {hasCount ? (
                      <span
                        className={cn(
                          'tabular rounded-full px-2 py-0.5 text-xs font-medium',
                          isActive ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        <span className="sr-only">(</span>
                        {item.count}
                        <span className="sr-only">)</span>
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default ScheduleTabs;
