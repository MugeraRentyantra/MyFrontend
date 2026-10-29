import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeGithubCallback,
  connectGithub,
  disconnectGithub,
  getGithubConnection,
} from '@/services/githubService';
import { queryKeys } from '@/services/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLES } from '@/shared/constants';

export const DISCONNECTED = Object.freeze({
  connected: false,
  githubUsername: null,
  scopes: [],
  connectedAt: null,
});

/** Normalises GET /github/connection. Tokens are never part of the response. */
function toConnection(data) {
  if (!data || !data.connected) return DISCONNECTED;
  return {
    connected: true,
    githubUsername: data.githubUsername ?? null,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    connectedAt: data.connectedAt ?? null,
  };
}

/** The student's GitHub connection status (SD9). */
export function useGithubConnection(options = {}) {
  const { isAuthenticated, hasRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.github.connection,
    queryFn: () => getGithubConnection(),
    select: toConnection,
    enabled: isAuthenticated && hasRole(ROLES.STUDENT),
    ...options,
  });
}

/**
 * POST /github/connect -> { authorizationUrl, state }. The caller sends the browser to
 * `authorizationUrl` (GitHub's consent screen, or the mock callback in mock mode).
 */
export function useConnectGithub() {
  return useMutation({ mutationFn: () => connectGithub() });
}

/** DELETE /github/connection */
export function useDisconnectGithub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disconnectGithub(),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.github.connection, { ...DISCONNECTED });
      queryClient.invalidateQueries({ queryKey: queryKeys.github.connection });
    },
  });
}

/** GET /github/callback?code&state -> { connected: true, githubUsername } */
export function useCompleteGithubCallback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, state }) => completeGithubCallback({ code, state }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.github.connection });
    },
  });
}

export default useGithubConnection;
