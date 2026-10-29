import { api } from './api';

/** Teams (SD10, SD11, SD12). Max 5 members including the leader; teams pay full price. */
export const createTeam = ({ name, planId }) => api.post('/teams', { name, planId });

export const getMyTeams = () => api.get('/teams/mine');

export const getTeam = (id) => api.get(`/teams/${encodeURIComponent(id)}`);

export const inviteMembers = (teamId, emails) =>
  api.post(`/teams/${encodeURIComponent(teamId)}/invites`, { emails });

export const resendInvite = (teamId, inviteId) =>
  api.post(`/teams/${encodeURIComponent(teamId)}/invites/${encodeURIComponent(inviteId)}/resend`);

export const cancelInvite = (teamId, inviteId) =>
  api.delete(`/teams/${encodeURIComponent(teamId)}/invites/${encodeURIComponent(inviteId)}`);

export const getInvite = (token) => api.get(`/teams/invites/${encodeURIComponent(token)}`);

export const acceptInvite = (token) =>
  api.post(`/teams/invites/${encodeURIComponent(token)}/accept`);

export const declineInvite = (token) =>
  api.post(`/teams/invites/${encodeURIComponent(token)}/decline`);

export const getReadiness = (teamId) =>
  api.get(`/teams/${encodeURIComponent(teamId)}/readiness`);

export const updateRepo = (teamId, repoUrl) =>
  api.put(`/teams/${encodeURIComponent(teamId)}/repo`, { repoUrl });

export const getTeamProgress = (teamId) =>
  api.get(`/teams/${encodeURIComponent(teamId)}/progress`);
