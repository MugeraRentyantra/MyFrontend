import { lazy } from 'react';

/**
 * Every route-level page is code-split. Page modules must `export default` the page component.
 */

// App-level
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
export const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'));
export const UiKitPage = lazy(() => import('@/pages/UiKitPage'));

// Public catalog (SN5)
export const HomePage = lazy(() => import('@/features/internships/pages/HomePage'));
export const CatalogPage = lazy(() => import('@/features/internships/pages/CatalogPage'));
export const DesignationDetailPage = lazy(
  () => import('@/features/internships/pages/DesignationDetailPage'),
);

// Auth (SN3, SN4)
export const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
export const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
export const CheckEmailPage = lazy(() => import('@/features/auth/pages/CheckEmailPage'));
export const VerifyEmailPage = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
export const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
export const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'));

// Assessment (SN6, SN7)
export const AssessmentPage = lazy(() => import('@/features/assessment/pages/AssessmentPage'));
export const AssessmentResultPage = lazy(
  () => import('@/features/assessment/pages/AssessmentResultPage'),
);

// Enrollment, terms and payment (SN8, SN9, SN13)
export const EnrollPage = lazy(() => import('@/features/enrollment/pages/EnrollPage'));
export const PaymentPage = lazy(() => import('@/features/enrollment/pages/PaymentPage'));
export const PaymentStatusPage = lazy(() => import('@/features/enrollment/pages/PaymentStatusPage'));
export const TermsPage = lazy(() => import('@/features/enrollment/pages/TermsPage'));

// Teams (SN10, SN11)
export const TeamCreatePage = lazy(() => import('@/features/teams/pages/TeamCreatePage'));
export const TeamDashboardPage = lazy(() => import('@/features/teams/pages/TeamDashboardPage'));
export const TeamInvitePage = lazy(() => import('@/features/teams/pages/TeamInvitePage'));

// Student learning area (GP2-GP6, GP8-GP12)
export const StudentDashboardPage = lazy(
  () => import('@/features/dashboard/pages/StudentDashboardPage'),
);
export const SchedulePage = lazy(() => import('@/features/schedule/pages/SchedulePage'));
export const SopReaderPage = lazy(() => import('@/features/schedule/pages/SopReaderPage'));
export const TaskBoardPage = lazy(() => import('@/features/tasks/pages/TaskBoardPage'));
export const TaskDetailPage = lazy(() => import('@/features/tasks/pages/TaskDetailPage'));
export const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
export const GithubCallbackPage = lazy(() => import('@/features/github/pages/GithubCallbackPage'));
export const CertificatePage = lazy(() => import('@/features/certificates/pages/CertificatePage'));
export const VerifyCertificatePage = lazy(
  () => import('@/features/certificates/pages/VerifyCertificatePage'),
);

// Trainer (KD9, KD10, KD13)
export const TrainerDashboardPage = lazy(
  () => import('@/features/trainer/pages/TrainerDashboardPage'),
);
export const ReviewPage = lazy(() => import('@/features/trainer/pages/ReviewPage'));
export const TrainerReportsPage = lazy(() => import('@/features/trainer/pages/TrainerReportsPage'));

// Admin (KD1-KD8, KD11, KD12, GP7, GP13)
export const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'));
export const UsersPage = lazy(() => import('@/features/admin/pages/UsersPage'));
export const AdminEnrollmentsPage = lazy(() => import('@/features/admin/pages/EnrollmentsPage'));
export const AdminPaymentsPage = lazy(() => import('@/features/admin/pages/PaymentsPage'));
export const AdminCertificatesPage = lazy(() => import('@/features/admin/pages/CertificatesPage'));
export const AuditLogPage = lazy(() => import('@/features/admin/pages/AuditLogPage'));
export const DesignationsPage = lazy(() => import('@/features/catalog/pages/DesignationsPage'));
export const DomainsPage = lazy(() => import('@/features/catalog/pages/DomainsPage'));
export const PlansPage = lazy(() => import('@/features/catalog/pages/PlansPage'));
export const AssessmentConfigListPage = lazy(
  () => import('@/features/assessment-builder/pages/AssessmentConfigListPage'),
);
export const AssessmentBuilderPage = lazy(
  () => import('@/features/assessment-builder/pages/AssessmentBuilderPage'),
);
export const ScheduleListPage = lazy(
  () => import('@/features/schedule-builder/pages/ScheduleListPage'),
);
export const ScheduleEditorPage = lazy(
  () => import('@/features/schedule-builder/pages/ScheduleEditorPage'),
);
export const TaskEditorPage = lazy(() => import('@/features/schedule-builder/pages/TaskEditorPage'));
export const TasksIndexPage = lazy(() => import('@/features/schedule-builder/pages/TasksIndexPage'));
export const AssignmentsPage = lazy(() => import('@/features/assignments/pages/AssignmentsPage'));
