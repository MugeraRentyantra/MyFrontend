import { useState } from 'react';
import { Button, StatusBanner, toast } from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import { Mail, MailCheck, RefreshCw } from '@/shared/icons';
import { getErrorMessage } from '@/shared/utils/errors';
import { useResendVerification } from '../hooks/useResendVerification';

/**
 * Shown when the student's email is not verified (SN13): they can still choose a plan and accept
 * the terms, but payment stays blocked (403 EMAIL_NOT_VERIFIED). Offers "Resend email" and
 * "I've verified it" (reloads the user so the block lifts without a page refresh).
 */
export function VerifyEmailNotice({
  email,
  title = 'Verify your email before paying',
  children,
  className,
}) {
  const { user, refreshUser } = useAuth();
  const address = email ?? user?.email ?? '';
  const resend = useResendVerification();
  const [checking, setChecking] = useState(false);

  const handleResend = () => {
    if (!address) return;
    resend.mutate(address, {
      onSuccess: () =>
        toast.success('Verification email sent', {
          description: `Open the link we sent to ${address}.`,
        }),
      onError: (error) =>
        toast.error("We couldn't send the email", { description: getErrorMessage(error) }),
    });
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const fresh = await refreshUser();
      if (fresh?.emailVerified) {
        toast.success('Email verified', { description: 'Payment is unlocked.' });
      } else {
        toast.info('Not verified yet', {
          description: 'Open the link in the email we sent you, then try again.',
        });
      }
    } catch (error) {
      toast.error("We couldn't check right now", { description: getErrorMessage(error) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <StatusBanner
      variant="warning"
      icon={MailCheck}
      title={title}
      className={className}
      action={
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={Mail}
            loading={resend.isPending}
            disabled={!address}
            onClick={handleResend}
          >
            Resend email
          </Button>
          <Button size="sm" variant="ghost" leftIcon={RefreshCw} loading={checking} onClick={handleCheck}>
            I&apos;ve verified it
          </Button>
        </div>
      }
    >
      {children ?? (
        <>
          We sent a verification link to{' '}
          <span className="break-all font-medium">{address || 'your email address'}</span>. You can
          choose a plan and accept the terms now, but payment stays locked until your email is
          verified.
        </>
      )}
    </StatusBanner>
  );
}

export default VerifyEmailNotice;
