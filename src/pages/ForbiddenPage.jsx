import { useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { Footer } from '@/shared/components/layout/Footer';
import { Navbar } from '@/shared/components/layout/Navbar';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { ROLE_LABELS, ROUTES, SUPPORT_EMAIL, getHomeRoute, paths } from '@/shared/constants';
import { ArrowRight, LogIn, RefreshCw, ShieldAlert } from '@/shared/icons';
import { humanize } from '@/shared/utils/helpers';

function formatRoles(roles = []) {
  const labels = roles.map((role) => ROLE_LABELS[role] ?? humanize(role)).filter(Boolean);
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function ForbiddenContent() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSwitching, setIsSwitching] = useState(false);

  const isLoading = status === 'loading';
  const isSignedIn = status === 'authenticated' && Boolean(user);
  const roleText = formatRoles(user?.roles);

  // Come back to the page that was refused after signing in with another account.
  const attemptedPath =
    location.pathname === ROUTES.FORBIDDEN ? undefined : `${location.pathname}${location.search}`;
  const loginPath = paths.login(attemptedPath);

  const handleSwitchAccount = async () => {
    setIsSwitching(true);
    try {
      await logout();
      navigate(loginPath, { replace: true });
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/60">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="eyebrow mt-6">403</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        You don&apos;t have access to this page
      </h1>

      <div className="mt-3 max-w-lg space-y-2 text-base text-slate-600">
        {isSignedIn ? (
          <p>
            You&apos;re signed in as <span className="font-medium text-slate-900">{user.name}</span>
            {roleText ? ` (${roleText})` : ''}. This area is for a different role, so this account
            can&apos;t open it.
          </p>
        ) : (
          <p>This area is only available to signed-in members with the right role.</p>
        )}
        <p className="text-sm text-slate-500">
          Think this is a mistake?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
            Contact support
          </a>
          .
        </p>
      </div>

      <div className="mt-8 flex min-h-[2.5rem] w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        {!isLoading && isSignedIn ? (
          <>
            <Button as={Link} to={getHomeRoute(user)} rightIcon={ArrowRight}>
              Go to my dashboard
            </Button>
            <Button
              variant="ghost"
              leftIcon={RefreshCw}
              loading={isSwitching}
              onClick={() => {
                void handleSwitchAccount();
              }}
            >
              Switch account
            </Button>
          </>
        ) : null}
        {!isLoading && !isSignedIn ? (
          <>
            <Button as={Link} to={loginPath} leftIcon={LogIn}>
              Log in
            </Button>
            <Button as={Link} to={ROUTES.HOME} variant="ghost">
              Go to home
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}

/**
 * 403 page (KD1). Rendered at /403 inside the public layout, and in place of a page by
 * RoleRoute (outside any layout) — in that case it brings its own navbar and footer.
 * Layouts pass an Outlet context ({ shell }) so the page can tell the two apart.
 */
export function ForbiddenPage() {
  useDocumentTitle('Access denied');
  const outletContext = useOutletContext();

  if (outletContext?.shell) {
    return <ForbiddenContent />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <ForbiddenContent />
      </main>
      <Footer />
    </div>
  );
}

export default ForbiddenPage;
