import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acceptTerms, createEnrollment } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';
import { paths } from '@/shared/constants';

/**
 * "Continue to payment" on /enroll (SN8): creates the PENDING_PAYMENT enrollment from the quote,
 * records the accepted terms version, then opens the payment page.
 *
 * mutate({ quoteId, termsVersion })               new enrollment from a quote
 * mutate({ enrollmentId, termsVersion })          existing enrollment: only accept the terms
 *
 * If the enrollment was created but accepting the terms failed, a retry with the same quote
 * reuses that enrollment instead of creating a duplicate.
 */
export function useEnrollFlow() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const created = useRef(null);

  return useMutation({
    mutationFn: async ({ quoteId, enrollmentId, termsVersion }) => {
      let id = enrollmentId ?? null;
      if (!id) {
        if (created.current && created.current.quoteId === quoteId) {
          id = created.current.enrollmentId;
        } else {
          const enrollment = await createEnrollment(quoteId);
          id = enrollment._id;
          created.current = { quoteId, enrollmentId: id };
        }
      }
      await acceptTerms({ enrollmentId: id, termsVersion });
      return id;
    },
    onSuccess: (enrollmentId) => {
      navigate(paths.payment(enrollmentId));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
  });
}

export default useEnrollFlow;
