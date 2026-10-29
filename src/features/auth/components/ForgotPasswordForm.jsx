import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/components/ui';
import { Mail, Send } from '@/shared/icons';
import { forgotPasswordSchema } from '../schemas/authValidation';
import { applyKnownFieldErrors } from '../utils/authErrors';
import { AuthErrorBanner } from './AuthErrorBanner';

/**
 * Forgot password form (SN4). `onSubmit({ email })` resolves when the request went through
 * (the page then shows the same confirmation for every email) and rejects only for errors
 * worth showing — offline, rate limited, server error — which appear as a retryable banner.
 */
export function ForgotPasswordForm({ onSubmit, isPending = false, defaultEmail = '', className }) {
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail },
  });

  const submit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await onSubmit?.({ email });
    } catch (error) {
      if (applyKnownFieldErrors(error, setError, ['email'])) {
        setFocus('email');
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

        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          leftIcon={Mail}
          error={errors.email}
          {...register('email')}
        />

        <Button type="submit" size="lg" fullWidth loading={busy} leftIcon={Send}>
          {formError ? 'Try again' : 'Send reset link'}
        </Button>
      </div>
    </form>
  );
}

export default ForgotPasswordForm;
