import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { getSafeRedirect, paths } from '@/shared/constants';
import { ArrowLeft, Inbox, MailCheck, MousePointerClick, RefreshCw } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { isValidEmail } from '@/shared/utils/helpers';
import { AuthCard } from '../components/AuthCard';
import { MockInboxHint } from '../components/MockInboxHint';
import { ResendVerificationForm } from '../components/ResendVerificationForm';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useResendVerification } from '../hooks/useResendVerification';

/** /check-email?email=&redirect= (SN3) — shown right after registering. */
export function CheckEmailPage() {
  useDocumentTitle('Check your email');
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { resend, isPending, isCoolingDown, cooldownRemaining } = useResendVerification();

  const paramEmail = (searchParams.get('email') ?? '').trim();
  const fallbackEmail = user && !user.emailVerified ? (user.email ?? '') : '';
  const email = isValidEmail(paramEmail) ? paramEmail : fallbackEmail;
  const redirectTo = getSafeRedirect(searchParams.get('redirect'));

  return (
    <AuthCard
      align="center"
      icon={MailCheck}
      title="Check your email"
      description={
        email ? (
          <>
            We sent a verification link to{' '}
            <span className="break-all font-medium text-slate-900">{email}</span>. It&apos;s valid
            for 24 hours.
          </>
        ) : (
          "We sent a verification link to your email address. It's valid for 24 hours."
        )
      }
      footer={
        <Link
          to={paths.login(redirectTo)}
          className={cn(AUTH_LINK_CLASS, 'inline-flex items-center gap-1.5')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to log in
        </Link>
      }
    >
      <div className="space-y-5">
        <ul
          role="list"
          className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-inset ring-slate-200"
        >
          <li className="flex gap-3">
            <MousePointerClick className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>
              Open the email and select the link to verify your account. You&apos;ll need a
              verified email before you can pay for an internship.
            </span>
          </li>
          <li className="flex gap-3">
            <Inbox className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>Can&apos;t find it? Check your spam or promotions folder.</span>
          </li>
        </ul>

        <MockInboxHint />

        {email ? (
          <Button
            variant="outline"
            fullWidth
            leftIcon={RefreshCw}
            loading={isPending}
            disabled={isCoolingDown}
            onClick={() => resend(email)}
          >
            {isCoolingDown ? `Resend available in ${cooldownRemaining}s` : 'Resend email'}
          </Button>
        ) : (
          <ResendVerificationForm submitLabel="Resend email" />
        )}

        {user ? null : (
          <p className="text-center text-sm text-slate-500">
            Used the wrong address?{' '}
            <Link to={paths.register(redirectTo)} className={AUTH_LINK_CLASS}>
              Sign up again
            </Link>
          </p>
        )}
      </div>
    </AuthCard>
  );
}

export default CheckEmailPage;
