import { api } from './api';

/** GitHub OAuth (SD9). Tokens never reach the browser; only status is returned. */
export const connectGithub = () => api.post('/github/connect');

export const completeGithubCallback = ({ code, state }) =>
  api.get('/github/callback', { code, state });

export const getGithubConnection = () => api.get('/github/connection');

export const disconnectGithub = () => api.delete('/github/connection');
