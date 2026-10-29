import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { ROUTES } from '@/shared/constants';
import { AlertTriangle, ArrowLeft, CheckCircle2, Hourglass, KeyRound, LogIn, Send } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { AuthCard } from '../components/AuthCard';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useResetPassword } from '../hooks/usePasswordReset';
import { getTokenErrorKind } from '../utils/authErrors';

const TITLES = {
  form: 'Set a new password',
  success: 'Password updated',
  expired: 'Reset link expired',
  invalid: 'Invalid reset link',
};

function BackToLogin() {
  return (
    <Link to={ROUTES.LOGIN} className={cn(AUTH_LINK_CLASS, 'inline-flex items-center gap-1.5')}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to log in
    </Link>
  );
}

/**
 * /reset-password?token= (SN4). The token is only checked when the form is submitted
 * (there is no "check token" endpoint); expired and invalid tokens get their own states.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();
  const { isAuthenticated, logout } = useAuth();
  const { resetPassword, isPending } = useResetPassword();
  // Remember which token a result belongs to, so opening a newer link starts fresh.
  const [result, setResult] = useState({ token: null, view: 'form' });

  let view = 'form';
  if (!token) view = 'invalid';
  else if (result.token === token) view = result.view;

  useDocumentTitle(TITLES[view]);

  const handleSubmit = async ({ password }) => {
    try {
      await resetPassword({ token, password });
    } catch (error) {
      const kind = getTokenErrorKind(error);
      if (kind === 'expired' || kind === 'invalid') {
        setResult({ token, view: kind });
        return;
      }
      throw error;
    }
    // The server ends every session after a reset; drop the local one too.
    if (isAuthenticated) {
      try {
        await logout();
      } catch {
        // logout() already clears the local session even when the request fails
      }
    }
    setResult({ token, view: 'success' });
  };

  if (view === 'success') {
    return (
      <AuthCard
        key="success"
        autoFocusHeading
        align="center"
        icon={CheckCircle2}
        tone="success"
        title="Password updated"
        description="Your password has been changed and you've been signed out everywhere. Log in with your new password to continue."
      >
        <Button as={Link} to={ROUTES.LOGIN} size="lg" fullWidth leftIcon={LogIn}>
          Log in
        </Button>
      </AuthCard>
    );
  }

  if (view === 'expired' || view === 'invalid') {
    const expired = view === 'expired';
    return (
      <AuthCard
        key={view}
        autoFocusHeading={Boolean(token)}
        align="center"
        icon={expired ? Hourglass : AlertTriangle}
        tone={expired ? 'warning' : 'danger'}
        title={expired ? 'This reset link has expired' : 'This reset link is invalid or was already used'}
        description={
          expired
            ? 'Reset links are valid for 1 hour. Request a new one to choose your password.'
            : 'Each reset link works only once. Request a new one to choose your password.'
        }
        footer={<BackToLogin />}
      >
        <Button as={Link} to={ROUTES.FORGOT_PASSWORD} size="lg" fullWidth leftIcon={Send}>
          Request a new link
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      key="form"
      icon={KeyRound}
      title="Set a new password"
      description="Choose a new password for your account. You'll use it the next time you log in."
      footer={<BackToLogin />}
    >
      <ResetPasswordForm onSubmit={handleSubmit} isPending={isPending} />
    </AuthCard>
  );
}

export default ResetPasswordPage;
