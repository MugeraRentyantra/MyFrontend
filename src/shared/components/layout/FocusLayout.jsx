import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button, Logo, PageLoader } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { X } from '@/shared/icons';

const OUTLET_CONTEXT = Object.freeze({ shell: 'focus' });

/**
 * Distraction-free shell for the assessment and the enrollment/checkout flow (SN6–SN9).
 * Pages that must guard unsaved work (the assessment) block the "Exit" navigation themselves.
 */
export function FocusLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="h-16 shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to={ROUTES.DASHBOARD} />
          <Button
            as={Link}
            to={ROUTES.DASHBOARD}
            variant="ghost"
            size="sm"
            leftIcon={X}
            aria-label="Exit to dashboard"
          >
            Exit
          </Button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet context={OUTLET_CONTEXT} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default FocusLayout;
