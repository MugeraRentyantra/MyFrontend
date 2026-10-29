import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  DescriptionList,
  StatusBadge,
  StatusBanner,
  toast,
} from '@/shared/components/ui';
import { AlertTriangle, BadgeCheck, Mail } from '@/shared/icons';
import { ROLE_LABELS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDate, humanize } from '@/shared/utils/helpers';
import { useResendVerification } from '../hooks/useProfile';

function VerificationBadge({ verified }) {
  return verified ? (
    <Badge variant="success" icon={BadgeCheck}>
      Verified
    </Badge>
  ) : (
    <Badge variant="warning" icon={AlertTriangle}>
      Unverified
    </Badge>
  );
}

/**
 * Account summary (GP11): avatar, name, email with its verification state, roles and the
 * member-since date. Unverified accounts can resend the verification email from here.
 */
export function AccountDetails({ user, className }) {
  const resend = useResendVerification();
  if (!user) return null;

  const verified = Boolean(user.emailVerified);
  const roles = Array.isArray(user.roles) ? user.roles : [];

  const handleResend = () => {
    if (!user.email) return;
    resend.mutate(user.email, {
      onSuccess: () =>
        toast.success('Verification email sent', {
          description: `Check your inbox at ${user.email}.`,
        }),
      onError: (error) =>
        toast.error(getErrorMessage(error, "We couldn't send the email. Please try again.")),
    });
  };

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="flex flex-col items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-brand-50/70 to-white px-5 pb-5 pt-6 text-center">
        <Avatar name={user.name} size="xl" aria-hidden="true" className="ring-4 ring-white" />
        <div className="min-w-0 max-w-full">
          <h2 className="break-words text-lg font-semibold tracking-tight text-slate-900">
            {user.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <span className="break-all text-sm text-slate-500">{user.email}</span>
            <VerificationBadge verified={verified} />
          </div>
        </div>
        {roles.length > 0 ? (
          <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Roles">
            {roles.map((role) => (
              <li key={role}>
                <Badge variant="brand">{ROLE_LABELS[role] ?? humanize(role)}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <CardBody className="space-y-5">
        <DescriptionList
          items={[
            user.status && {
              label: 'Account status',
              value: <StatusBadge status={user.status} />,
            },
            { label: 'Member since', value: formatDate(user.createdAt) },
          ]}
        />

        {!verified ? (
          <StatusBanner variant="warning" title="Verify your email address">
            <p>
              We sent a verification link to <span className="font-medium">{user.email}</span>.
              You need a verified email before you can pay for an internship.
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={Mail}
              loading={resend.isPending}
              onClick={handleResend}
              className="mt-3"
            >
              {resend.isSuccess ? 'Send again' : 'Resend verification email'}
            </Button>
          </StatusBanner>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default AccountDetails;
