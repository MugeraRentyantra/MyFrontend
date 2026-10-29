import { api } from './api';

/**
 * The student's internship "application" lifecycle: quote -> enrollment -> terms ->
 * (payment, see paymentService) -> schedule, SOPs and tasks (MM8, SD5, SD6, MM9, MM11, MM15).
 */

/** { planId, teamId? } -> Quote (individual discount from the score; team = 0%) */
export const getQuote = ({ planId, teamId }) =>
  api.post('/enrollments/quote', teamId ? { planId, teamId } : { planId });

/** Creates a PENDING_PAYMENT enrollment from a (non-expired) quote. */
export const createEnrollment = (quoteId) => api.post('/enrollments', { quoteId });

export const getEnrollments = (params = {}) => api.get('/enrollments', { limit: 50, ...params });

export const getEnrollment = (id) => api.get(`/enrollments/${encodeURIComponent(id)}`);

export const getEnrollmentSchedule = (id) =>
  api.get(`/enrollments/${encodeURIComponent(id)}/schedule`);

/** -> { dayNumber, title, contentHtml, watermarkText } (paid, active enrollments only) */
export const getSop = (enrollmentId, dayNumber) =>
  api.get(
    `/enrollments/${encodeURIComponent(enrollmentId)}/schedule/days/${encodeURIComponent(dayNumber)}/sop`,
  );

export const getEnrollmentTasks = (id) =>
  api.get(`/enrollments/${encodeURIComponent(id)}/tasks`, { limit: 200 });

export const getLatestTerms = () => api.get('/terms/latest');

export const acceptTerms = ({ enrollmentId, termsVersion }) =>
  api.post('/terms/accept', { enrollmentId, termsVersion });
