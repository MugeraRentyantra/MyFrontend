/** Student dashboard (GP2) — public API of the feature. */
export { default as StudentDashboardPage } from './pages/StudentDashboardPage';
export { ApplicationsSection } from './components/ApplicationsSection';
export { CertificateStatusCard } from './components/CertificateStatusCard';
export { DashboardSkeleton } from './components/DashboardSkeleton';
export { EnrollmentSwitcher } from './components/EnrollmentSwitcher';
export { GithubStatusChip } from './components/GithubStatusChip';
export { LockedScheduleTeaser } from './components/LockedScheduleTeaser';
export { NextTaskCard } from './components/NextTaskCard';
export { NoEnrollmentState } from './components/NoEnrollmentState';
export { PaymentPendingBanner } from './components/PaymentPendingBanner';
export { PaymentUnlocksCard } from './components/PaymentUnlocksCard';
export { PendingReviewsCard } from './components/PendingReviewsCard';
export { ProgressCard } from './components/ProgressCard';
export { UpcomingDaysCard } from './components/UpcomingDaysCard';
export { WelcomeHeader } from './components/WelcomeHeader';
export { useStudentDashboard } from './hooks/useStudentDashboard';
export * from './utils/dashboardHelpers';
