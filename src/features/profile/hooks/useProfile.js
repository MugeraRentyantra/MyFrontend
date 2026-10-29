import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, resendVerification, updateMe } from '@/services/authService';
import { getMyAttempts } from '@/services/assessmentService';
import { queryKeys } from '@/services/queryKeys';
import { useAuth } from '@/shared/hooks/useAuth';
import { ROLES } from '@/shared/constants';

/** Lists arrive as { items, ... }; tolerate a bare array if another screen cached one. */
function toList(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

function selectNewestAttemptsFirst(data) {
  return [...toList(data)].sort(
    (a, b) => new Date(b?.submittedAt ?? 0).getTime() - new Date(a?.submittedAt ?? 0).getTime(),
  );
}

/**
 * The signed-in user for the profile page (GP11). Shows the session user immediately and
 * refreshes it from GET /auth/me, so a verification done in another tab (or a role change)
 * is reflected here and in the rest of the app.
 */
export function useProfile() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => getMe(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
  const fresh = query.data;

  useEffect(() => {
    if (fresh && typeof fresh === 'object' && fresh._id) updateUser(fresh);
  }, [fresh, updateUser]);

  return {
    user: fresh && fresh._id ? fresh : user,
    isLoading: !user && query.isLoading,
    isRefreshing: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

/** PATCH /auth/me { name } -> User; keeps AuthContext and the /auth/me cache in sync. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: ({ name }) => updateMe({ name }),
    onSuccess: (updated, variables) => {
      if (updated && typeof updated === 'object' && updated._id) {
        updateUser(updated);
        queryClient.setQueryData(queryKeys.auth.me, updated);
      } else {
        updateUser({ name: variables.name });
      }
    },
  });
}

/** POST /auth/resend-verification { email } -> { message } */
export function useResendVerification() {
  return useMutation({ mutationFn: (email) => resendVerification(email) });
}

/** The student's assessment attempts (with designation refs), newest first. */
export function useMyAttempts(options = {}) {
  const { isAuthenticated, hasRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.assessment.myAttempts,
    queryFn: () => getMyAttempts(),
    select: selectNewestAttemptsFirst,
    enabled: isAuthenticated && hasRole(ROLES.STUDENT),
    ...options,
  });
}

export default useProfile;
