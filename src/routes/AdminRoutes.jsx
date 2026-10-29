import AdminLayout from '@/shared/components/layout/AdminLayout';
import { ROLES } from '@/shared/constants';
import ProtectedRoute from './ProtectedRoute';
import {
  AdminCertificatesPage,
  AdminDashboardPage,
  AdminEnrollmentsPage,
  AdminPaymentsPage,
  AssessmentBuilderPage,
  AssessmentConfigListPage,
  AssignmentsPage,
  AuditLogPage,
  DesignationsPage,
  DomainsPage,
  PlansPage,
  ScheduleEditorPage,
  ScheduleListPage,
  TaskEditorPage,
  TasksIndexPage,
  UsersPage,
} from './lazyPages';

export const adminRoutes = {
  path: 'admin',
  element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
  children: [
    {
      element: <AdminLayout />,
      children: [
        { index: true, element: <AdminDashboardPage /> },
        { path: 'users', element: <UsersPage /> },
        { path: 'designations', element: <DesignationsPage /> },
        { path: 'domains', element: <DomainsPage /> },
        { path: 'plans', element: <PlansPage /> },
        { path: 'assessments', element: <AssessmentConfigListPage /> },
        { path: 'assessments/:designationId', element: <AssessmentBuilderPage /> },
        { path: 'schedules', element: <ScheduleListPage /> },
        { path: 'schedules/:id', element: <ScheduleEditorPage /> },
        { path: 'schedules/:id/tasks', element: <TaskEditorPage /> },
        { path: 'tasks', element: <TasksIndexPage /> },
        { path: 'enrollments', element: <AdminEnrollmentsPage /> },
        { path: 'payments', element: <AdminPaymentsPage /> },
        { path: 'assignments', element: <AssignmentsPage /> },
        { path: 'certificates', element: <AdminCertificatesPage /> },
        { path: 'audit', element: <AuditLogPage /> },
      ],
    },
  ],
};

export default adminRoutes;
