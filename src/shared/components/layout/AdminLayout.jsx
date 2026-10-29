import { ROUTES } from '@/shared/constants';
import { DashboardLayout } from './DashboardLayout';
import { getAdminNavigation } from './navigation';

/** Static, so it is built once. */
const ADMIN_NAVIGATION = getAdminNavigation();

/**
 * Admin console (KD1): Overview; People; Catalog; Learning; Operations.
 * Non-admins never reach this layout: RoleRoute renders the 403 page in its place.
 */
export function AdminLayout() {
  return <DashboardLayout navigation={ADMIN_NAVIGATION} roleLabel="Admin" homeTo={ROUTES.ADMIN} />;
}

export default AdminLayout;
