import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, PasswordInput } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { Lock, Mail } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getErrorStatus, isNetworkError } from '@/shared/utils/errors';
import { LOGIN_DEFAULTS, loginSchema } from '../schemas/authValidation';
import { applyKnownFieldErrors, hasKnownFieldErrors } from '../utils/authErrors';
import { AuthErrorBanner } from './AuthErrorBanner';
import { DemoAccounts } from './DemoAccounts';
import { AUTH_LINK_CLASS } from './authStyles';

const LOGIN_FIELDS = ['email', 'password'];

/**
 * Login form (SN3). Presentational: the page passes `onSubmit` / `isPending` / `error` from
 * useLogin(), which performs the request and the redirect.
 *  - 401 -> one "Email or password is incorrect." banner, the password is cleared and focused
 *  - 403 ACCOUNT_SUSPENDED, 429 and network errors -> matching banners
 *  - 422 with field details -> messages under the fields
 * In mock mode `showDemoAccounts` adds the demo-account picker, which fills both fields.
 */
export function LoginForm({
  onSubmit,
  isPending = false,
  error = null,
  onErrorReset,
  defaultEmail = '',
  forgotPasswordTo = ROUTES.FORGOT_PASSWORD,
  showDemoAccounts = false,
  className,
}) {
  const passwordId = useId();
  const submitRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { ...LOGIN_DEFAULTS, email: defaultEmail },
  });

  const showBanner = Boolean(error) && !hasKnownFieldErrors(error, LOGIN_FIELDS);

  // React once to each failed attempt (every failure is a new error object).
  useEffect(() => {
    if (!error) return;
    const field = applyKnownFieldErrors(error, setError, LOGIN_FIELDS);
    if (field) {
      setFocus(field);
      return;
    }
    if (!isNetworkError(error) && getErrorStatus(error) === 401) {
      setValue('password', '');
      setFocus('password');
    }
  }, [error, setError, setFocus, setValue]);

  const submit = handleSubmit(async (values) => {
    await onSubmit?.(values);
  });

  const handleDemoSelect = ({ email, password }) => {
    onErrorReset?.();
    clearErrors();
    setValue('email', email, { shouldDirty: true });
    setValue('password', password, { shouldDirty: true });
    submitRef.current?.focus();
  };

  const busy = isSubmitting || isPending;

  return (
    <div className={className}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {showBanner ? <AuthErrorBanner error={error} context="login" /> : null}

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

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor={passwordId} className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to={forgotPasswordTo} className={cn(AUTH_LINK_CLASS, 'text-sm')}>
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id={passwordId}
            autoComplete="current-password"
            leftIcon={Lock}
            error={errors.password}
            {...register('password')}
          />
        </div>

        <Button ref={submitRef} type="submit" size="lg" fullWidth loading={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      {showDemoAccounts ? <DemoAccounts className="mt-6" onSelect={handleDemoSelect} /> : null}
    </div>
  );
}

export default LoginForm;
