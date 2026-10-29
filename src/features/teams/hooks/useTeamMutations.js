import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  cancelInvite,
  createTeam,
  declineInvite,
  inviteMembers,
  resendInvite,
  updateRepo,
} from '@/services/teamService';
import { queryKeys } from '@/services/queryKeys';

/** Refreshes every team query (mine, detail, readiness, progress, invite) in the background. */
function useInvalidateTeams() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
  };
}

/**
 * Creates the team, then sends the invites (if any). An invite failure does not undo the team:
 * the result carries `inviteError` so the screen can explain that invites can be sent later.
 * mutate({ name, planId, emails }) -> { team, invited: TeamMember[], inviteError }
 */
export function useCreateTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: async ({ name, planId, emails = [] }) => {
      const team = await createTeam({ name, planId });
      if (!emails.length) return { team, invited: [], inviteError: null };
      try {
        const result = await inviteMembers(team._id, emails);
        return { team, invited: result?.items ?? [], inviteError: null };
      } catch (inviteError) {
        return { team, invited: [], inviteError };
      }
    },
    onSuccess: invalidate,
  });
}

/** mutate(emails[]) -> { items: TeamMember[] } */
export function useInviteMembers(teamId) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (emails) => inviteMembers(teamId, emails),
    onSuccess: invalidate,
  });
}

/** mutate(inviteId) -> TeamMember (new link, new expiry) */
export function useResendInvite(teamId) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (inviteId) => resendInvite(teamId, inviteId),
    onSuccess: invalidate,
  });
}

/** mutate(inviteId) -> 204 */
export function useCancelInvite(teamId) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (inviteId) => cancelInvite(teamId, inviteId),
    onSuccess: invalidate,
  });
}

/** mutate(repoUrl) -> Team (leader only) */
export function useUpdateRepo(teamId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (repoUrl) => updateRepo(teamId, repoUrl),
    onSuccess: (team) => {
      if (team?._id) queryClient.setQueryData(queryKeys.teams.detail(teamId), team);
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      // Task screens show the team repository too.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/** mutate() -> Team */
export function useAcceptInvite(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
  });
}

/** mutate() -> { message } */
export function useDeclineInvite(token) {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: () => declineInvite(token),
    onSuccess: invalidate,
  });
}
