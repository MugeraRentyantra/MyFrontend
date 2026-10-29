import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as authService from '@/services/authService';
import { toast } from '@/shared/components/ui';
import { getErrorMessage } from '@/shared/utils/errors';
import { useCooldown } from './useCooldown';

export const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Re-sends the verification email (SN3) with a cooldown between sends.
 *
 *   const { resend, isPending, isCoolingDown, cooldownRemaining, sentTo } = useResendVerification();
 *   resend(email, { onError })   // onError(error) returns true when it handled the error itself
 *
 * The API answers the same way whether or not the account exists, so the copy never claims
 * that a specific account received an email.
 */
export function useResendVerification({ cooldownSeconds = RESEND_COOLDOWN_SECONDS } = {}) {
  const cooldown = useCooldown(cooldownSeconds);
  const { start: startCooldown, isActive: isCoolingDown, remaining } = cooldown;

  const mutation = useMutation({
    mutationFn: (email) => authService.resendVerification(String(email ?? '').trim()),
    onSuccess: () => {
      startCooldown();
      toast.success('Verification email sent', {
        description: "If this account still needs verifying, a new link is on its way. It's valid for 24 hours.",
      });
    },
  });

  const { mutate, isPending } = mutation;

  const resend = useCallback(
    (email, { onError } = {}) => {
      if (isPending || isCoolingDown) return;
      mutate(email, {
        onError: (error) => {
          if (typeof onError === 'function' && onError(error) === true) return;
          toast.error("We couldn't send the email", { description: getErrorMessage(error) });
        },
      });
    },
    [isPending, isCoolingDown, mutate],
  );

  return {
    resend,
    isPending,
    isCoolingDown,
    cooldownRemaining: remaining,
    sentTo: mutation.isSuccess ? String(mutation.variables ?? '').trim() : null,
  };
}

export default useResendVerification;
