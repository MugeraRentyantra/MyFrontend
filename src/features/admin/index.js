/**
 * Admin operations (KD1 dashboard, GP7 users, KD8 enrollments & payments, KD12 certificates, GP13 audit log).
 * Route pages are lazy-loaded from src/routes/lazyPages.js and are not re-exported here (keeps them split).
 */

// Components
export { VerificationTable } from './components/VerificationTable';
export { KpiRow } from './components/KpiRow';
export { RevenueChart } from './components/RevenueChart';
export { EnrollmentsByDesignationChart } from './components/EnrollmentsByDesignationChart';
export { AttentionList } from './components/AttentionList';
export { QuickLinks } from './components/QuickLinks';
export { RoleChangeDialog } from './components/RoleChangeDialog';
export { UserStatusDialog } from './components/UserStatusDialog';
export { EnrollmentDrawer } from './components/EnrollmentDrawer';
export { PaymentDrawer } from './components/PaymentDrawer';
export { AuditLogDrawer } from './components/AuditLogDrawer';
export { AuditDiff } from './components/AuditDiff';
export { DateRangeFilter } from './components/DateRangeFilter';
export { FilterSelect } from './components/FilterSelect';
export { ClearFiltersButton } from './components/ClearFiltersButton';
export { PersonCell } from './components/PersonCell';
export { PlanCell } from './components/PlanCell';
export { RoleBadges } from './components/RoleBadges';
export { PaymentEventsTimeline } from './components/PaymentEventsTimeline';

// Hooks
export {
  useAdminDashboard,
  useAdminStats,
  usePaymentsNeedingAttention,
} from './hooks/useAdminDashboard';
export {
  fetchAdminUsers,
  useUpdateUserRoles,
  useUpdateUserStatus,
  useUserOptions,
} from './hooks/useAdminUsers';
export {
  fetchAdminEnrollments,
  useAdminEnrollment,
  useDesignationOptions,
} from './hooks/useAdminEnrollments';
export { fetchAdminPayments, useAdminPayment } from './hooks/useAdminPayments';
export {
  fetchAdminCertificates,
  hasPendingEmail,
  useResendCertificateEmail,
} from './hooks/useAdminCertificates';
export { fetchAuditLogs, useAuditActorOptions } from './hooks/useAuditLogs';
export { useUrlFilters } from './hooks/useUrlFilters';

// Helpers
export {
  adminLinks,
  buildAuditDiff,
  getPaymentEventMeta,
  planLabel,
  planMeta,
  planTitle,
} from './utils/format';
