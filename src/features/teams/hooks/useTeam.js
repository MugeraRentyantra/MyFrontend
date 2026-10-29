import { useQuery } from '@tanstack/react-query';
import { getInvite, getReadiness, getTeam, getTeamProgress } from '@/services/teamService';
import { queryKeys } from '@/services/queryKeys';
import { TEAM_STATUS } from '@/shared/constants';

/** While a team is still forming, teammates join and pay elsewhere: refresh readiness every 30 s. */
const READINESS_POLL_MS = 30000;

/** GET /teams/:id — Team (403 for non-members). */
export function useTeam(teamId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: () => getTeam(teamId),
    enabled: Boolean(teamId) && enabled,
    ...options,
  });
}

/** GET /teams/:id/readiness — { teamId, status, ready, members[] }. Polls until the team starts. */
export function useTeamReadiness(teamId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.teams.readiness(teamId),
    queryFn: () => getReadiness(teamId),
    enabled: Boolean(teamId) && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === TEAM_STATUS.ACTIVE || status === TEAM_STATUS.DISBANDED) return false;
      return READINESS_POLL_MS;
    },
    ...options,
  });
}

/** GET /teams/:id/progress — shared task progress + contributions (active teams). */
export function useTeamProgress(teamId, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.teams.progress(teamId),
    queryFn: () => getTeamProgress(teamId),
    enabled: Boolean(teamId) && enabled,
    ...options,
  });
}

/** GET /teams/invites/:token — public invite details (works signed out). */
export function useTeamInvite(token, { enabled = true, ...options } = {}) {
  return useQuery({
    queryKey: queryKeys.teams.invite(token),
    queryFn: () => getInvite(token),
    enabled: Boolean(token) && enabled,
    retry: false,
    ...options,
  });
}
