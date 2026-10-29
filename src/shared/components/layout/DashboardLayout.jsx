import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Drawer, PageLoader } from '@/shared/components/ui';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const OUTLET_CONTEXT = Object.freeze({ shell: 'dashboard' });
/** Tailwind `lg` breakpoint: the fixed sidebar takes over from the drawer here. */
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/**
 * Workspace shell shared by the student, trainer and admin areas (SN1, GP2, KD1).
 * - lg and up: fixed 16rem sidebar + sticky top bar.
 * - below lg: the top bar's menu button opens the same navigation in a left drawer,
 *   which closes on navigation, on Esc and when the viewport grows to desktop size.
 *
 * navigation: [{ title?, items: [{ label, to, icon, end?, badge?, badgeLabel?, hidden?, activePaths? }] }]
 */
export function DashboardLayout({ navigation = [], roleLabel, homeTo = '/' }) {
  const location = useLocation();

  // The drawer remembers the location it was opened on: any navigation closes it.
  const [openedAt, setOpenedAt] = useState(null);
  const drawerOpen = openedAt !== null && openedAt === location.key;
  const openDrawer = () => setOpenedAt(location.key);
  const closeDrawer = () => setOpenedAt(null);

  useEffect(() => {
    if (!drawerOpen || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const media = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event) => {
      if (event.matches) setOpenedAt(null);
    };
    if (typeof media.addEventListener !== 'function') return undefined;
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar navigation={navigation} roleLabel={roleLabel} homeTo={homeTo} />
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} side="left" size="sm" title="Menu">
        <Sidebar
          variant="drawer"
          navigation={navigation}
          roleLabel={roleLabel}
          homeTo={homeTo}
          onNavigate={closeDrawer}
        />
      </Drawer>

      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <Topbar
          onMenuClick={openDrawer}
          roleLabel={roleLabel}
          homeTo={homeTo}
          menuOpen={drawerOpen}
        />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<PageLoader />}>
              <Outlet context={OUTLET_CONTEXT} />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
