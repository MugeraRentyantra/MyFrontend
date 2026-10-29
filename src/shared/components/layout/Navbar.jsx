import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Button, Drawer, Logo } from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import { ROUTES, getHomeRoute } from '@/shared/constants';
import { ArrowRight, Menu } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { PUBLIC_NAV_LINKS } from './navigation';
import { UserMenu } from './UserMenu';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

function desktopLinkClass(isActive) {
  return cn(
    'rounded-md text-sm font-medium transition-colors',
    FOCUS_RING,
    isActive ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900',
  );
}

function mobileLinkClass(isActive) {
  return cn(
    'flex min-h-[2.75rem] items-center rounded-lg px-3 py-2 text-base font-medium transition-colors',
    FOCUS_RING,
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
  );
}

function PublicNavLink({ link, mobile = false, onNavigate }) {
  const getClassName = mobile ? mobileLinkClass : desktopLinkClass;
  if (link.anchor) {
    return (
      <Link to={link.to} className={getClassName(false)} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  }
  return (
    <NavLink to={link.to} className={({ isActive }) => getClassName(isActive)} onClick={onNavigate}>
      {link.label}
    </NavLink>
  );
}

/**
 * Public top navigation (SN1). Sticky, translucent; collapses into a drawer below md.
 * Auth buttons are not rendered while the session is being restored, so signed-in
 * visitors never see a "Log in" button flash first.
 */
export function Navbar() {
  const { user, status } = useAuth();
  const location = useLocation();

  // The drawer remembers the location it was opened on: any navigation closes it.
  const [openedAt, setOpenedAt] = useState(null);
  const menuOpen = openedAt !== null && openedAt === location.key;
  const openMenu = () => setOpenedAt(location.key);
  const closeMenu = () => setOpenedAt(null);

  const isResolved = status !== 'loading';
  const isSignedIn = status === 'authenticated' && Boolean(user);
  const homeRoute = getHomeRoute(user);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-10">
          <Logo to={ROUTES.HOME} />
          <nav aria-label="Primary" className="hidden md:block">
            <ul role="list" className="flex items-center gap-7">
              {PUBLIC_NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <PublicNavLink link={link} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isResolved && isSignedIn ? (
            <>
              <div className="hidden md:block">
                <Button as={Link} to={homeRoute} size="sm">
                  Go to dashboard
                </Button>
              </div>
              <UserMenu />
            </>
          ) : null}

          {isResolved && !isSignedIn ? (
            <div className="hidden items-center gap-2 md:flex">
              <Button as={Link} to={ROUTES.LOGIN} variant="ghost" size="sm">
                Log in
              </Button>
              <Button as={Link} to={ROUTES.REGISTER} size="sm">
                Get started
              </Button>
            </div>
          ) : null}

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={openMenu}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <Drawer open={menuOpen} onClose={closeMenu} side="right" size="sm" title="Menu">
        <nav aria-label="Primary">
          <ul role="list" className="space-y-1">
            {PUBLIC_NAV_LINKS.map((link) => (
              <li key={link.label}>
                <PublicNavLink link={link} mobile onNavigate={closeMenu} />
              </li>
            ))}
          </ul>
        </nav>

        {isResolved ? (
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            {isSignedIn ? (
              <>
                <p className="text-sm text-slate-500">
                  Signed in as <span className="font-medium text-slate-900">{user.name}</span>
                </p>
                <Button as={Link} to={homeRoute} fullWidth rightIcon={ArrowRight} onClick={closeMenu}>
                  Go to dashboard
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to={ROUTES.REGISTER} fullWidth onClick={closeMenu}>
                  Get started
                </Button>
                <Button as={Link} to={ROUTES.LOGIN} variant="outline" fullWidth onClick={closeMenu}>
                  Log in
                </Button>
              </>
            )}
          </div>
        ) : null}
      </Drawer>
    </header>
  );
}

export default Navbar;
