import { useMutation } from '@tanstack/react-query';
import { resendVerification } from '@/services/authService';

/** Sends a fresh email-verification link: mutate(email). */
export function useResendVerification() {
  return useMutation({
    mutationFn: (email) => resendVerification(email),
  });
}

export default useResendVerification;
