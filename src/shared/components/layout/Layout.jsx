import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { PageLoader } from '@/shared/components/ui';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

/** Pages can read this with useOutletContext() to know they render inside a shell. */
const OUTLET_CONTEXT = Object.freeze({ shell: 'public' });

/** Sticky navbar height (64px) plus a little breathing room. */
const HEADER_OFFSET_PX = 80;
/** Pages are lazy-loaded, so the target section may appear a moment after navigation. */
const HASH_WAIT_MS = 3000;

/**
 * Scrolls to `#section` links such as "/#how-it-works" once the (lazy) page has rendered,
 * leaving room for the sticky navbar. Back/forward navigation keeps the restored position.
 */
function useScrollToHash() {
  const { hash, key } = useLocation();
  const navigationType = useNavigationType();
  const initialKey = useRef(key);

  useEffect(() => {
    if (!hash || hash.length < 2) return undefined;
    if (navigationType === 'POP' && key !== initialKey.current) return undefined;

    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // keep the raw value
    }

    let frame = 0;
    const startedAt = Date.now();
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
        window.scrollTo({ top: Math.max(0, top) });
        return;
      }
      if (Date.now() - startedAt < HASH_WAIT_MS) {
        frame = window.requestAnimationFrame(tryScroll);
      }
    };
    frame = window.requestAnimationFrame(tryScroll);
    return () => window.cancelAnimationFrame(frame);
  }, [hash, key, navigationType]);
}

/** Public shell (SN1): navbar, page content and footer. */
export function Layout() {
  useScrollToHash();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet context={OUTLET_CONTEXT} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
