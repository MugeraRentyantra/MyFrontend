import { NavLink } from 'react-router-dom';
import { Briefcase, Building2 } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const CATALOG_TABS = [
  { label: 'Designations', to: ROUTES.ADMIN_DESIGNATIONS, icon: Briefcase },
  { label: 'Domains', to: ROUTES.ADMIN_DOMAINS, icon: Building2 },
];

/**
 * Route links styled as underline tabs (Designations | Domains). They are real links, so each
 * section keeps its own URL; the active one gets aria-current="page" from NavLink.
 */
export function CatalogTabs({ className }) {
  return (
    <nav aria-label="Catalog sections" className={cn('scrollbar-thin overflow-x-auto', className)}>
      <ul className="flex gap-6 shadow-[inset_0_-1px_0_0_#e2e8f0]">
        {CATALOG_TABS.map(({ label, to, icon: Icon }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={to}
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
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default CatalogTabs;
