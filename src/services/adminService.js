import { api } from './api';

/** Admin operations (MM16, MM18, SD15). Lists take { page, limit, search, ...filters }. */
export const getAdminStats = () => api.get('/admin/stats');

// Users and roles
export const getUsers = (params = {}) => api.get('/admin/users', params);
export const updateUserRoles = (id, roles) =>
  api.patch(`/admin/users/${encodeURIComponent(id)}/roles`, { roles });
export const updateUserStatus = (id, status) =>
  api.patch(`/admin/users/${encodeURIComponent(id)}/status`, { status });

// Enrollments and payments monitoring
export const getAdminEnrollments = (params = {}) => api.get('/admin/enrollments', params);
export const getAdminEnrollment = (id) => api.get(`/admin/enrollments/${encodeURIComponent(id)}`);
export const getAdminPayments = (params = {}) => api.get('/admin/payments', params);
export const getAdminPayment = (id) => api.get(`/admin/payments/${encodeURIComponent(id)}`);

// Certificates and email status
export const getAdminCertificates = (params = {}) => api.get('/admin/certificates', params);
export const resendCertificateEmail = (id) =>
  api.post(`/admin/certificates/${encodeURIComponent(id)}/resend`);

// Audit log (append-only)
export const getAuditLogs = (params = {}) => api.get('/admin/audit-logs', params);
