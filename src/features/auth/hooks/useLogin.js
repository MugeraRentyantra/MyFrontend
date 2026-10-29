import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { getHomeRoute, getSafeRedirect } from '@/shared/constants';

/**
 * Login (SN3). Signs in through AuthContext, then sends the user to the safe `?redirect=`
 * target or to their role's home (admin -> /admin, trainer -> /trainer, student -> /dashboard).
 *
 *   const { login, isPending, error, reset, redirectTo } = useLogin();
 *   login({ email, password }) -> Promise<user | null>   (never rejects; read `error`)
 */
export function useLogin() {
  const { login: signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));
  const inFlight = useRef(false);

  const mutation = useMutation({
    mutationFn: ({ email, password }) =>
      signIn({ email: String(email ?? '').trim(), password: String(password ?? '') }),
    onSuccess: (user) => {
      navigate(redirectTo ?? getHomeRoute(user), { replace: true });
    },
  });

  const { mutateAsync, isPending, error, reset } = mutation;

  const login = useCallback(
    async (values) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      try {
        return await mutateAsync(values);
      } catch {
        // The error is exposed through `error`; nothing else to do here.
        return null;
      } finally {
        inFlight.current = false;
      }
    },
    [mutateAsync],
  );

  return { login, isPending, error, reset, redirectTo };
}

export default useLogin;
