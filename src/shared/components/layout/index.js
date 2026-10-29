/**
 * Application shell (SN1, GP2, KD1). Route files import each layout's default export
 * directly; everything is also available here as named exports.
 */
export { RootLayout } from './RootLayout';
export { Layout } from './Layout';
export { Navbar } from './Navbar';
export { Footer } from './Footer';
export { AuthLayout } from './AuthLayout';
export { FocusLayout } from './FocusLayout';
export { DashboardLayout } from './DashboardLayout';
export { Sidebar } from './Sidebar';
export { Topbar } from './Topbar';
export { UserMenu } from './UserMenu';
export { StudentLayout } from './StudentLayout';
export { TrainerLayout } from './TrainerLayout';
export { AdminLayout } from './AdminLayout';
export {
  HOW_IT_WORKS_PATH,
  PUBLIC_NAV_LINKS,
  getAdminNavigation,
  getStudentNavigation,
  getTrainerNavigation,
} from './navigation';
