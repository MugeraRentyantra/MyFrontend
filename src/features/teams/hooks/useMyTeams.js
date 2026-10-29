import { useQuery } from '@tanstack/react-query';
import { getMyTeams } from '@/services/teamService';
import { queryKeys } from '@/services/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLES } from '@/shared/constants';

/** Teams the current student leads or has joined (array). Used by the sidebar and dashboard. */
export function useMyTeams(options = {}) {
  const { isAuthenticated, hasRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.teams.mine,
    queryFn: getMyTeams,
    select: (data) => data?.items ?? [],
    enabled: isAuthenticated && hasRole(ROLES.STUDENT),
    ...options,
  });
}

export default useMyTeams;
