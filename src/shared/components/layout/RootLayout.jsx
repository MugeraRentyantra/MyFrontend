import { Suspense, lazy } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { PageLoader, Toaster } from '@/shared/components/ui';
import { USE_MOCKS } from '@/shared/constants';

/** The mock devtools (GP1) are only downloaded when the app runs against the mock API. */
const MockDevtools = lazy(() => import('@/mocks/MockDevtools'));

const MAIN_CONTENT_ID = 'main-content';

/**
 * Moves focus to the page's <main id="main-content"> without changing the URL hash
 * (a hash change would be treated as a router navigation).
 */
function handleSkipToContent(event) {
  event.preventDefault();
  const target = document.getElementById(MAIN_CONTENT_ID);
  if (target) target.focus();
}

/**
 * Root of the route tree (SN1): scroll restoration, skip link, toasts, the lazy page
 * boundary and, in mock mode, the floating Mock API devtools. Must not pass an Outlet
 * context: pages use its absence to know they render without a shell.
 */
export function RootLayout() {
  return (
    <>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={handleSkipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brand-700 focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Skip to content
      </a>
      <ScrollRestoration />
      <Suspense fallback={<PageLoader fullScreen />}>
        <Outlet />
      </Suspense>
      <Toaster />
      {USE_MOCKS ? (
        <Suspense fallback={null}>
          <MockDevtools />
        </Suspense>
      ) : null}
    </>
  );
}

export default RootLayout;
