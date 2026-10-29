import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useDocumentTitle } from '@/shared/hooks';
import { ROUTES } from '@/shared/constants';
import { ArrowLeft, KeyRound, MailCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { isValidEmail } from '@/shared/utils/helpers';
import { AuthCard } from '../components/AuthCard';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { MockInboxHint } from '../components/MockInboxHint';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useForgotPassword } from '../hooks/usePasswordReset';

function BackToLogin() {
  return (
    <Link to={ROUTES.LOGIN} className={cn(AUTH_LINK_CLASS, 'inline-flex items-center gap-1.5')}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to log in
    </Link>
  );
}

/**
 * /forgot-password (SN4). Always shows the same confirmation, so the page never reveals
 * whether an account exists; only a request that did not get through shows an error.
 */
export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const { requestReset, isPending, sentTo, lastEmail, startOver } = useForgotPassword();
  const [returnedToForm, setReturnedToForm] = useState(false);

  useDocumentTitle(sentTo ? 'Check your email' : 'Forgot your password');

  const paramEmail = (searchParams.get('email') ?? '').trim();
  const defaultEmail = lastEmail || (isValidEmail(paramEmail) ? paramEmail : '');

  if (sentTo) {
    return (
      <AuthCard
        key="sent"
        autoFocusHeading
        align="center"
        icon={MailCheck}
        title="Check your email"
        description={
          <>
            If an account exists for{' '}
            <span className="break-all font-medium text-slate-900">{sentTo}</span>, we&apos;ve sent
            a reset link. It expires in 1 hour.
          </>
        }
        footer={
          <>
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => {
                setReturnedToForm(true);
                startOver();
              }}
              className={AUTH_LINK_CLASS}
            >
              try another email
            </button>
            .
          </>
        }
      >
        <div className="space-y-4">
          <MockInboxHint />
          <Button as={Link} to={ROUTES.LOGIN} size="lg" fullWidth leftIcon={ArrowLeft}>
            Back to log in
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      key="form"
      autoFocusHeading={returnedToForm}
      icon={KeyRound}
      title="Forgot your password?"
      description="Enter the email address you use for your account and we'll send you a link to reset your password."
      footer={<BackToLogin />}
    >
      <ForgotPasswordForm
        onSubmit={({ email }) => requestReset(email)}
        isPending={isPending}
        defaultEmail={defaultEmail}
      />
    </AuthCard>
  );
}

export default ForgotPasswordPage;
