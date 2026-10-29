import { StatusBanner } from '@/shared/components/ui';
import { SUPPORT_EMAIL } from '@/shared/constants';
import { Clock, ShieldAlert, WifiOff } from '@/shared/icons';
import { describeAuthError, describeLoginError } from '../utils/authErrors';

const KIND_ICONS = {
  network: WifiOff,
  suspended: ShieldAlert,
  'rate-limited': Clock,
};

/**
 * Form-level error for the auth screens. `context="login"` uses the single
 * "Email or password is incorrect." message for 401s (SN3).
 */
export function AuthErrorBanner({ error, context = 'form', className, ...rest }) {
  const content = context === 'login' ? describeLoginError(error) : describeAuthError(error);
  if (!content) return null;

  const action =
    content.kind === 'suspended' ? (
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="whitespace-nowrap rounded-sm text-sm font-medium text-rose-800 underline underline-offset-4 hover:text-rose-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Email support
      </a>
    ) : undefined;

  return (
    <StatusBanner
      variant="error"
      title={content.title}
      icon={KIND_ICONS[content.kind]}
      action={action}
      className={className}
      {...rest}
    >
      {content.description || undefined}
    </StatusBanner>
  );
}

export default AuthErrorBanner;
