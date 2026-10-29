import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, PasswordInput } from '@/shared/components/ui';
import { Lock } from '@/shared/icons';
import { RESET_PASSWORD_DEFAULTS, resetPasswordSchema } from '../schemas/authValidation';
import { applyKnownFieldErrors } from '../utils/authErrors';
import { AuthErrorBanner } from './AuthErrorBanner';
import { PasswordRules } from './PasswordRules';

const RESET_FIELDS = ['password', 'confirmPassword'];

/**
 * New password + confirmation (SN4) with the live rules checklist under the password field.
 * `onSubmit({ password })` rejects with the ApiError for problems the form should show
 * (422 field details, offline, server error); token problems are handled by the page.
 */
export function ResetPasswordForm({ onSubmit, isPending = false, className }) {
  const rulesId = useId();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    trigger,
    watch,
    formState: { errors, isSubmitting, isSubmitted, touchedFields },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { ...RESET_PASSWORD_DEFAULTS },
  });

  const password = watch('password');
  const confirmTouched = Boolean(touchedFields.confirmPassword);

  // Keep "Passwords don't match" in sync when the first field changes after the second was used.
  useEffect(() => {
    if (confirmTouched || isSubmitted) trigger('confirmPassword');
  }, [password, confirmTouched, isSubmitted, trigger]);

  const submit = handleSubmit(async ({ password: newPassword }) => {
    setFormError(null);
    try {
      await onSubmit?.({ password: newPassword });
    } catch (error) {
      const field = applyKnownFieldErrors(error, setError, RESET_FIELDS);
      if (field) {
        setFocus(field);
        return;
      }
      setFormError(error);
    }
  });

  const busy = isSubmitting || isPending;

  return (
    <form onSubmit={submit} noValidate className={className}>
      <div className="space-y-5">
        {formError ? <AuthErrorBanner error={formError} /> : null}

        <div className="space-y-3">
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            leftIcon={Lock}
            aria-describedby={rulesId}
            error={errors.password}
            {...register('password')}
          />
          <PasswordRules id={rulesId} value={password} />
        </div>

        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          leftIcon={Lock}
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" fullWidth loading={busy}>
          {busy ? 'Updating password…' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}

export default ResetPasswordForm;
