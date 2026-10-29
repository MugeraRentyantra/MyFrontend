import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Spinner } from '@/shared/components/ui';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { ROUTES, getHomeRoute } from '@/shared/constants';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Hourglass,
  RefreshCw,
  WifiOff,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { AuthCard } from '../components/AuthCard';
import { ResendVerificationForm } from '../components/ResendVerificationForm';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useVerifyEmail } from '../hooks/useVerifyEmail';

const TITLES = {
  verifying: 'Verifying your email',
  success: 'Email verified',
  verified: 'Email already verified',
  expired: 'Verification link expired',
  invalid: 'Invalid verification link',
  network: 'Verification failed',
  error: 'Verification failed',
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
 * /verify-email?token= (SN3). Works signed in or out. The token is sent exactly once
 * (StrictMode-safe, see useVerifyEmail); every outcome has its own designed state.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();
  const verification = useVerifyEmail(token);
  const { user, isAuthenticated, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [continuing, setContinuing] = useState(false);
  const refreshedRef = useRef(false);

  const alreadyVerified =
    verification.status === 'invalid' && isAuthenticated && Boolean(user?.emailVerified);
  const view = alreadyVerified ? 'verified' : verification.status;

  useDocumentTitle(TITLES[view] ?? TITLES.error);

  // Signed-in user: refresh the cached profile so "verify your email" notices disappear at once.
  useEffect(() => {
    if (verification.status !== 'success' || !isAuthenticated || refreshedRef.current) return;
    refreshedRef.current = true;
    refreshUser().catch(() => {});
  }, [verification.status, isAuthenticated, refreshUser]);

  const handleContinue = async () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    setContinuing(true);
    let nextUser = user;
    try {
      nextUser = await refreshUser();
    } catch {
      // Keep the cached user: the home route only depends on the role.
    }
    navigate(getHomeRoute(nextUser), { replace: true });
  };

  const continueButton = (
    <Button size="lg" fullWidth rightIcon={ArrowRight} loading={continuing} onClick={handleContinue}>
      {isAuthenticated ? 'Continue' : 'Continue to log in'}
    </Button>
  );

  if (view === 'verifying') {
    return (
      <AuthCard
        key="verifying"
        align="center"
        title="Verifying your email"
        description="This only takes a moment."
      >
        <div className="flex justify-center py-2">
          <Spinner size="lg" label="Verifying your email" />
        </div>
      </AuthCard>
    );
  }

  if (view === 'success' || view === 'verified') {
    return (
      <AuthCard
        key={view}
        autoFocusHeading
        align="center"
        icon={BadgeCheck}
        tone="success"
        title={view === 'success' ? 'Email verified' : 'Your email is already verified'}
        description={
          isAuthenticated
            ? "You're all set. You can now pay for your internship and start learning."
            : "You're all set. Log in to take your assessment and choose a plan."
        }
      >
        {continueButton}
      </AuthCard>
    );
  }

  if (view === 'expired') {
    return (
      <AuthCard
        key="expired"
        autoFocusHeading
        align="center"
        icon={Hourglass}
        tone="warning"
        title="This link has expired"
        description="Verification links are valid for 24 hours. Enter your email address and we'll send you a new one."
        footer={<BackToLogin />}
      >
        <ResendVerificationForm defaultEmail={user?.email ?? ''} />
      </AuthCard>
    );
  }

  if (view === 'invalid') {
    return (
      <AuthCard
        key="invalid"
        autoFocusHeading={Boolean(token)}
        align="center"
        icon={AlertTriangle}
        tone="danger"
        title="This link is invalid or was already used"
        description="Each verification link works once. If you've already verified your email, just log in. Otherwise, request a new link below."
        footer={<BackToLogin />}
      >
        <ResendVerificationForm defaultEmail={user?.email ?? ''} />
      </AuthCard>
    );
  }

  const isNetwork = view === 'network';
  return (
    <AuthCard
      key="error"
      autoFocusHeading
      align="center"
      icon={isNetwork ? WifiOff : AlertTriangle}
      tone={isNetwork ? 'neutral' : 'danger'}
      title={isNetwork ? "Can't reach the server" : "We couldn't verify your email"}
      description={
        isNetwork
          ? 'Check your internet connection and try again.'
          : getErrorMessage(verification.error, 'Something went wrong. Please try again.')
      }
      footer={<BackToLogin />}
    >
      <Button size="lg" fullWidth leftIcon={RefreshCw} onClick={verification.retry}>
        Try again
      </Button>
    </AuthCard>
  );
}

export default VerifyEmailPage;
