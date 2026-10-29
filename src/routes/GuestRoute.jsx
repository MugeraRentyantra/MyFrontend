import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { PageLoader } from '@/shared/components/ui';
import { getHomeRoute, getSafeRedirect } from '@/shared/constants';

/** Login/register are for signed-out visitors; signed-in users go to their dashboard. */
export default function GuestRoute({ children }) {
  const { status, user } = useAuth();
  const [searchParams] = useSearchParams();

  if (status === 'loading') {
    return <PageLoader fullScreen label="Loading…" />;
  }

  if (status === 'authenticated') {
    const redirect = getSafeRedirect(searchParams.get('redirect'));
    return <Navigate to={redirect ?? getHomeRoute(user)} replace />;
  }

  return children ?? <Outlet />;
}
