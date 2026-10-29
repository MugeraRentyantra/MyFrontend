import { api } from './api';

/** Trainer workspace (MM13, MM14). A trainer only ever sees their own assignments. */
export const getTrainerStats = () => api.get('/trainer/stats');

export const getTrainerAssignments = (params = {}) =>
  api.get('/trainer/assignments', { limit: 100, ...params });

/** params: { status: 'PENDING' | ..., page, limit } — oldest first */
export const getTrainerSubmissions = (params = {}) => api.get('/trainer/submissions', params);

export const getTrainerSubmission = (id) =>
  api.get(`/trainer/submissions/${encodeURIComponent(id)}`);

/** { decision: APPROVED|CHANGES_REQUESTED|REJECTED, feedback } */
export const reviewSubmission = (id, { decision, feedback }) =>
  api.post(`/trainer/submissions/${encodeURIComponent(id)}/review`, { decision, feedback });
