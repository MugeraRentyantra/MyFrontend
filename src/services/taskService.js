import { api } from './api';

/** Student task endpoints (MM11, MM12). `progressId` is TaskProgress._id. */
export const getTaskContent = (progressId) =>
  api.get(`/tasks/${encodeURIComponent(progressId)}/content`);

export const startTask = (progressId) => api.post(`/tasks/${encodeURIComponent(progressId)}/start`);

/**
 * Multipart submission: 1-5 screenshots (png/jpg/webp, 5 MB each), a description of at
 * least 50 characters and a https://github.com/ link.
 */
export const submitTask = (progressId, { screenshots = [], description, githubUrl }, { onUploadProgress } = {}) => {
  const form = new FormData();
  screenshots.forEach((file) => form.append('screenshots', file));
  form.append('description', description ?? '');
  form.append('githubUrl', githubUrl ?? '');
  return api.post(`/tasks/${encodeURIComponent(progressId)}/submissions`, form, {
    onUploadProgress,
  });
};

export const getSubmissions = (progressId) =>
  api.get(`/tasks/${encodeURIComponent(progressId)}/submissions`, { limit: 50 });
