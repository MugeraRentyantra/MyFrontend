import { api } from './api';

/** Auth endpoints (MM2, SD3). Login/refresh return { accessToken, user }. */
export const register = ({ name, email, password }) =>
  api.post('/auth/register', { name, email, password });

export const login = ({ email, password }) => api.post('/auth/login', { email, password });

export const logout = () => api.post('/auth/logout');

export const getMe = () => api.get('/auth/me');

export const updateMe = ({ name }) => api.patch('/auth/me', { name });

export const verifyEmail = (token) => api.post('/auth/verify-email', { token });

export const resendVerification = (email) => api.post('/auth/resend-verification', { email });

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

export const resetPassword = ({ token, password }) =>
  api.post('/auth/reset-password', { token, password });
