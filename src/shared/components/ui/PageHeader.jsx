import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const FOCUS_RING =
  'rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-slate-500">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${index}-${crumb.to ?? ''}`} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              ) : null}
              {isLast || !crumb.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('truncate', isLast && 'font-medium text-slate-700')}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className={cn('truncate transition-colors duration-150 hover:text-slate-700', FOCUS_RING)}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Page title block: renders the page's single <h1>. Optional breadcrumbs, back link, eyebrow, description
 * and actions (stacked below the title on mobile, right-aligned from sm). `children` render below (e.g. Tabs).
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  backTo,
  eyebrow,
  children,
  className,
  ...rest
}) {
  return (
    <div className={cn('min-w-0', className)} {...rest}>
      {backTo?.to ? (
        <Link
          to={backTo.to}
          className={cn(
            'mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-slate-700',
            FOCUS_RING,
          )}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {backTo.label ?? 'Back'}
        </Link>
      ) : null}

      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
          <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? (
            <div className="mt-1 max-w-3xl text-sm text-slate-500">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}

export default PageHeader;
