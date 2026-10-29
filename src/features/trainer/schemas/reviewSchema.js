import { z } from 'zod';
import { REVIEW_DECISION } from '@/shared/constants';
import { DECISION_ORDER, FEEDBACK_MAX_LENGTH, FEEDBACK_MIN_LENGTH } from '../utils/reviewHelpers';

/**
 * Review decision form (KD10, MM14): a decision is required; feedback is required (at least
 * FEEDBACK_MIN_LENGTH characters) unless the decision is APPROVED. The server enforces the same
 * rules and its 422 field errors are mapped back onto these fields.
 */
export const reviewSchema = z
  .object({
    decision: z.enum(DECISION_ORDER, {
      errorMap: () => ({ message: 'Choose a decision.' }),
    }),
    feedback: z
      .string()
      .trim()
      .max(FEEDBACK_MAX_LENGTH, `Keep your feedback under ${FEEDBACK_MAX_LENGTH} characters.`),
  })
  .superRefine((values, ctx) => {
    if (values.decision === REVIEW_DECISION.APPROVED) return;
    const length = values.feedback.trim().length;
    if (length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['feedback'],
        message: 'Feedback is required unless you approve. Tell the student what to change.',
      });
    } else if (length < FEEDBACK_MIN_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['feedback'],
        message: `Write at least ${FEEDBACK_MIN_LENGTH} characters so the student knows what to fix.`,
      });
    }
  });

export const reviewDefaultValues = { decision: '', feedback: '' };
