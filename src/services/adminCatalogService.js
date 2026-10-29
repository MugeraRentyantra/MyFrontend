import { api, orNullOn404 } from './api';

/** Admin catalog configuration (MM4, MM5, MM6). No hard deletes: use status. */

// Designations
export const getAdminDesignations = (params = {}) => api.get('/admin/designations', params);
export const createDesignation = (data) => api.post('/admin/designations', data);
export const updateDesignation = (id, data) =>
  api.put(`/admin/designations/${encodeURIComponent(id)}`, data);
export const setDesignationStatus = (id, status) =>
  api.patch(`/admin/designations/${encodeURIComponent(id)}/status`, { status });

// Domains
export const getAdminDomains = (params = {}) => api.get('/admin/domains', params);
export const createDomain = (data) => api.post('/admin/domains', data);
export const updateDomain = (id, data) => api.put(`/admin/domains/${encodeURIComponent(id)}`, data);
export const setDomainStatus = (id, status) =>
  api.patch(`/admin/domains/${encodeURIComponent(id)}/status`, { status });

// Internship plans and pricing (basePrice in paise)
export const getAdminPlans = (params = {}) => api.get('/admin/internship-plans', params);
export const createPlan = (data) => api.post('/admin/internship-plans', data);
export const updatePlan = (id, data) =>
  api.put(`/admin/internship-plans/${encodeURIComponent(id)}`, data);
export const setPlanStatus = (id, status) =>
  api.patch(`/admin/internship-plans/${encodeURIComponent(id)}/status`, { status });

// Assessment configuration and discount slabs
export const getAssessmentConfigs = () => api.get('/admin/assessments');
/** Resolves to null when the designation has no config yet. */
export const getAssessmentConfig = (designationId) =>
  orNullOn404(api.get(`/admin/assessments/${encodeURIComponent(designationId)}`));
export const saveAssessmentConfig = (designationId, { questions, discountSlabs }) =>
  api.put(`/admin/assessments/${encodeURIComponent(designationId)}`, { questions, discountSlabs });
export const publishAssessmentConfig = (designationId) =>
  api.patch(`/admin/assessments/${encodeURIComponent(designationId)}/publish`);
