import { api } from './api';

/** Public catalog (MM4, MM5, MM9). Lists return { items, page, limit, total }. */
export const getDesignations = (params = {}) =>
  api.get('/designations', { limit: 50, ...params });

/** Accepts an ObjectId or a slug. */
export const getDesignation = (idOrSlug) =>
  api.get(`/designations/${encodeURIComponent(idOrSlug)}`);

export const getDomains = (params = {}) => api.get('/domains', { limit: 50, ...params });

/** params: { designationId, domainId, durationMonths, page, limit } */
export const getPlans = (params = {}) => api.get('/internship-plans', { limit: 100, ...params });

/** Day titles only (never SOP content) for the locked schedule preview. */
export const getSchedulePreview = (planId) =>
  api.get(`/internship-plans/${encodeURIComponent(planId)}/schedule-preview`);
