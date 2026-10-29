import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as authService from '@/services/authService';
import { shouldShowForgotPasswordError } from '../utils/authErrors';

/**
 * Forgot password (SN4). The confirmation is always the same whether or not the account exists;
 * only errors that mean the request never got through (offline, rate limited, server error,
 * invalid input) are surfaced.
 *
 *   const { requestReset, isPending, sentTo, lastEmail, startOver } = useForgotPassword();
 *   await requestReset(email)   // rejects only for errors worth showing
 */
export function useForgotPassword() {
  const [sentTo, setSentTo] = useState(null);
  const [lastEmail, setLastEmail] = useState('');

  const mutation = useMutation({
    mutationFn: async (email) => {
      const value = String(email ?? '').trim();
      try {
        await authService.forgotPassword(value);
      } catch (error) {
        if (shouldShowForgotPasswordError(error)) throw error;
      }
      return value;
    },
    onSuccess: (email) => {
      setLastEmail(email);
      setSentTo(email);
    },
  });

  const { mutateAsync, reset } = mutation;

  const startOver = useCallback(() => {
    setSentTo(null);
    reset();
  }, [reset]);

  return {
    requestReset: mutateAsync,
    isPending: mutation.isPending,
    sentTo,
    lastEmail,
    startOver,
  };
}

/**
 * Reset password with the emailed token (SN4).
 *   const { resetPassword, isPending } = useResetPassword();
 *   await resetPassword({ token, password })   // rejects with ApiError (TOKEN_EXPIRED, TOKEN_INVALID, 422…)
 */
export function useResetPassword() {
  const mutation = useMutation({
    mutationFn: ({ token, password }) => authService.resetPassword({ token, password }),
  });

  return { resetPassword: mutation.mutateAsync, isPending: mutation.isPending };
}
