import StudentLayout from '@/shared/components/layout/StudentLayout';
import FocusLayout from '@/shared/components/layout/FocusLayout';
import { ROLES } from '@/shared/constants';
import ProtectedRoute from './ProtectedRoute';
import {
  AssessmentPage,
  AssessmentResultPage,
  CertificatePage,
  EnrollPage,
  GithubCallbackPage,
  PaymentPage,
  PaymentStatusPage,
  ProfilePage,
  SchedulePage,
  SopReaderPage,
  StudentDashboardPage,
  TaskBoardPage,
  TaskDetailPage,
  TeamCreatePage,
  TeamDashboardPage,
} from './lazyPages';

/**
 * Student area. Learning screens use the sidebar layout; the assessment and the
 * enrollment/checkout flow use a distraction-free FocusLayout.
 */
export const studentRoutes = {
  element: <ProtectedRoute roles={[ROLES.STUDENT]} />,
  children: [
    {
      element: <StudentLayout />,
      children: [
        { path: 'dashboard', element: <StudentDashboardPage /> },
        { path: 'schedule', element: <SchedulePage /> },
        { path: 'schedule/:day/sop', element: <SopReaderPage /> },
        { path: 'tasks', element: <TaskBoardPage /> },
        { path: 'tasks/:id', element: <TaskDetailPage /> },
        { path: 'certificate', element: <CertificatePage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'team/new', element: <TeamCreatePage /> },
        { path: 'team/:id', element: <TeamDashboardPage /> },
        { path: 'github/callback', element: <GithubCallbackPage /> },
      ],
    },
    {
      element: <FocusLayout />,
      children: [
        { path: 'assessment/:designationId', element: <AssessmentPage /> },
        { path: 'assessment/:designationId/result', element: <AssessmentResultPage /> },
        { path: 'enroll', element: <EnrollPage /> },
        { path: 'payment/status', element: <PaymentStatusPage /> },
        { path: 'payment/:enrollmentId', element: <PaymentPage /> },
      ],
    },
  ],
};

export default studentRoutes;
