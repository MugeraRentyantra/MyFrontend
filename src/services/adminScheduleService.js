import { api } from './api';

/** Schedule templates and task definitions (MM9, MM10). Published versions are immutable. */
export const getSchedules = (params = {}) => api.get('/admin/schedules', params);
export const getSchedule = (id) => api.get(`/admin/schedules/${encodeURIComponent(id)}`);
export const createSchedule = (data) => api.post('/admin/schedules', data);
export const updateSchedule = (id, data) =>
  api.put(`/admin/schedules/${encodeURIComponent(id)}`, data);
export const publishSchedule = (id) =>
  api.patch(`/admin/schedules/${encodeURIComponent(id)}/publish`);
export const getScheduleVersions = (id) =>
  api.get(`/admin/schedules/${encodeURIComponent(id)}/versions`);
/** Creates a new DRAFT copied from this version (its tasks are copied too). */
export const cloneSchedule = (id) => api.post(`/admin/schedules/${encodeURIComponent(id)}/clone`);

export const getScheduleTasks = (templateId) =>
  api.get(`/admin/schedules/${encodeURIComponent(templateId)}/tasks`, { limit: 200 });
export const createTask = (data) => api.post('/admin/tasks', data);
export const updateTask = (id, data) => api.put(`/admin/tasks/${encodeURIComponent(id)}`, data);
export const deleteTask = (id) => api.delete(`/admin/tasks/${encodeURIComponent(id)}`);
export const reorderTasks = (templateId, orderedIds) =>
  api.patch(`/admin/schedules/${encodeURIComponent(templateId)}/tasks/reorder`, { orderedIds });
