import { forwardRef } from 'react';
import { Textarea } from '@/shared/components/ui';
import { SUBMISSION_RULES } from '@/shared/constants';

/**
 * Submission description (GP8): Textarea with a live counter ("37/50 characters minimum" until
 * the minimum is reached). Works with `{...register('description')}`; pass `count` (trimmed
 * length from `watch`) so the counter matches the validation.
 */
export const DescriptionField = forwardRef(function DescriptionField(
  { error, count, isResubmission = false, ...rest },
  ref,
) {
  return (
    <Textarea
      ref={ref}
      label="Description"
      required
      rows={6}
      showCount
      minLength={SUBMISSION_RULES.minDescriptionLength}
      maxLength={SUBMISSION_RULES.maxDescriptionLength}
      count={count}
      error={error}
      hint={
        isResubmission
          ? 'We filled in your previous description. Update it to explain what you changed.'
          : 'Explain what you built, how you tested it and anything your trainer should look at first.'
      }
      placeholder="What did you build? How did you test it? What should your trainer look at first?"
      {...rest}
    />
  );
});

export default DescriptionField;
