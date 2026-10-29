import { cn } from '@/shared/utils/cn';

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Scrolls to a section without changing the URL hash (a hash change would be treated as a router
 * navigation) and moves focus to its heading.
 */
function jumpTo(event, id) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

function TocList({ headings }) {
  return (
    <ol className="space-y-0.5 text-sm">
      {headings.map((heading, index) => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            onClick={(event) => jumpTo(event, heading.id)}
            className="flex min-h-[40px] items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <span className="tabular w-5 shrink-0 text-xs font-medium text-slate-400">
              {index + 1}.
            </span>
            <span className="min-w-0">{heading.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Table of contents for the terms page: a collapsible "On this page" panel on small screens and a
 * sticky sidebar from lg. `headings` = [{ id, text }] from extractTermsHeadings.
 */
export function TermsToc({ headings = [], className }) {
  if (!headings.length) return null;

  return (
    <>
      <details
        className={cn(
          'group mb-8 rounded-xl border border-slate-200 bg-white shadow-card lg:hidden',
          className,
        )}
      >
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 [&::-webkit-details-marker]:hidden">
          On this page
          <span
            aria-hidden="true"
            className="text-xs font-medium text-slate-500 group-open:hidden"
          >
            {headings.length} sections
          </span>
          <span aria-hidden="true" className="hidden text-xs font-medium text-slate-500 group-open:inline">
            Hide
          </span>
        </summary>
        <nav aria-label="On this page" className="border-t border-slate-100 px-2 py-2">
          <TocList headings={headings} />
        </nav>
      </details>

      <aside className={cn('hidden lg:block', className)}>
        <nav aria-label="On this page" className="sticky top-24">
          <p className="eyebrow mb-3 px-2.5">On this page</p>
          <TocList headings={headings} />
        </nav>
      </aside>
    </>
  );
}

export default TermsToc;
