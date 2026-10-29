import { api } from './api';

/** Admin trainer assignment (MM13, KD11). Reassigning keeps the history. */
export const getAdminAssignments = (params = {}) => api.get('/admin/trainer-assignments', params);

/** { trainerId, enrollmentId } or { trainerId, teamId } */
export const createAssignment = (data) => api.post('/admin/trainer-assignments', data);

export const removeAssignment = (id) =>
  api.delete(`/admin/trainer-assignments/${encodeURIComponent(id)}`);

export const getAdminTeams = (params = {}) => api.get('/admin/teams', params);
