import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { PageLoader } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import RoleRoute from './RoleRoute';

/**
 * Requires a signed-in user. While the session is being restored a loader is shown;
 * anonymous visitors are sent to /login?redirect=<current url>. When `roles` is given the
 * user must also have one of them (otherwise the 403 page is rendered in place).
 */
export default function ProtectedRoute({ roles, children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageLoader fullScreen label="Restoring your session…" />;
  }

  if (status !== 'authenticated') {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={paths.login(redirect)} replace />;
  }

  if (roles && roles.length > 0) {
    return <RoleRoute roles={roles}>{children}</RoleRoute>;
  }

  return children ?? <Outlet />;
}
