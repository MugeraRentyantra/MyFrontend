import { api, orNullOn404 } from './api';

/** Assessment (MM7). Questions never include answer keys; scoring happens on the server. */
export const getAssessment = (designationId) =>
  api.get(`/assessments/${encodeURIComponent(designationId)}`);

/** answers: [{ questionId, selectedIndex }] -> Attempt */
export const submitAssessment = (designationId, answers) =>
  api.post(`/assessments/${encodeURIComponent(designationId)}/submit`, { answers });

/** The current student's attempt for a designation, or null when not attempted yet. */
export const getMyAttempt = (designationId) =>
  orNullOn404(api.get(`/assessments/${encodeURIComponent(designationId)}/attempt`));

export const getMyAttempts = () => api.get('/assessments/attempts/mine');
