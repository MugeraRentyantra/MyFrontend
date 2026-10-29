import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { PageLoader } from '@/shared/components/ui';
import { ForbiddenPage } from './lazyPages';

/**
 * Renders children only for users holding one of `roles`. Everyone else sees the 403 page at
 * the same URL (KD1: "a non-admin who opens an admin URL sees a 403 page").
 */
export default function RoleRoute({ roles = [], children }) {
  const { hasAnyRole } = useAuth();

  if (!hasAnyRole(roles)) {
    return (
      <Suspense fallback={<PageLoader fullScreen />}>
        <ForbiddenPage />
      </Suspense>
    );
  }

  return children ?? <Outlet />;
}
