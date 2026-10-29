import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/shared/components/ui';
import { CheckCircle2, Mail, Send } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { useResendVerification } from '../hooks/useResendVerification';
import { resendSchema } from '../schemas/authValidation';
import { applyKnownFieldErrors } from '../utils/authErrors';

/**
 * "Send a new verification link" (SN3) for expired or invalid links and for /check-email when
 * the address is unknown. Uses a 30-second cooldown between sends; success and failure are
 * reported with toasts, and a short confirmation stays under the button.
 */
export function ResendVerificationForm({
  defaultEmail = '',
  submitLabel = 'Send a new link',
  className,
}) {
  const { resend, isPending, isCoolingDown, cooldownRemaining, sentTo } = useResendVerification();

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resendSchema),
    mode: 'onTouched',
    defaultValues: { email: defaultEmail ?? '' },
  });

  const submit = handleSubmit(({ email }) => {
    resend(email, {
      onError: (error) => {
        if (applyKnownFieldErrors(error, setError, ['email'])) {
          setFocus('email');
          return true;
        }
        return false;
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate className={cn('space-y-4', className)}>
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
      <Button
        type="submit"
        fullWidth
        leftIcon={Send}
        loading={isPending}
        disabled={isCoolingDown}
      >
        {isCoolingDown ? `Send again in ${cooldownRemaining}s` : submitLabel}
      </Button>
      {sentTo ? (
        <p className="flex items-start gap-2 text-xs leading-5 text-slate-600">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>
            If <span className="break-all font-medium text-slate-900">{sentTo}</span> still needs
            verifying, a new link is on its way. It&apos;s valid for 24 hours.
          </span>
        </p>
      ) : null}
    </form>
  );
}

export default ResendVerificationForm;
