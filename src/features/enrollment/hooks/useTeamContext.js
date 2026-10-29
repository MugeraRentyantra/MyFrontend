import { useMemo } from 'react';
import { useMyTeams } from '@/features/teams/hooks/useMyTeams';
import { TEAM_STATUS } from '@/shared/constants';
import { planDesignationId } from '../utils/plans';

/**
 * Whether the student enrolls as part of a team (SD10–SD12). Team members pay the full plan price
 * and quote with `teamId`; the plan is the one the team leader chose.
 *
 * - `teamId` given (from the URL): that team, looked up in "my teams" for display.
 * - otherwise: the first non-disbanded team whose plan belongs to `designationId`.
 *
 * Returns { team, teamId, teamPlanId, isSettled } — `isSettled` is false while my teams load,
 * so callers can wait before asking for a quote (a team quote differs from an individual one).
 */
export function useTeamContext({ designationId, teamId: requestedTeamId } = {}) {
  const query = useMyTeams();
  const teams = query.data;

  const team = useMemo(() => {
    const list = Array.isArray(teams) ? teams : [];
    if (requestedTeamId) return list.find((item) => item._id === requestedTeamId) ?? null;
    if (!designationId) return null;
    return (
      list.find(
        (item) =>
          item.status !== TEAM_STATUS.DISBANDED && planDesignationId(item.plan) === designationId,
      ) ?? null
    );
  }, [teams, requestedTeamId, designationId]);

  return {
    team,
    teamId: team?._id ?? (requestedTeamId || null),
    teamPlanId: team ? (team.planId ?? team.plan?._id ?? null) : null,
    isSettled: !query.isLoading,
    error: query.error,
  };
}

export default useTeamContext;
