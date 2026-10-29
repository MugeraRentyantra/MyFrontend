import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks';
import { USE_MOCKS, paths } from '@/shared/constants';
import { AuthCard } from '../components/AuthCard';
import { LoginForm } from '../components/LoginForm';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useLogin } from '../hooks/useLogin';

/** /login (SN3) — guest only; honours ?redirect= through useLogin. */
export function LoginPage() {
  useDocumentTitle('Log in');
  const location = useLocation();
  const { login, isPending, error, reset, redirectTo } = useLogin();
  const defaultEmail = typeof location.state?.email === 'string' ? location.state.email : '';

  return (
    <AuthCard
      title="Log in to your account"
      description={
        redirectTo
          ? 'Log in to continue where you left off.'
          : 'Welcome back. Enter your details to continue.'
      }
      footer={
        <>
          New here?{' '}
          <Link to={paths.register(redirectTo)} className={AUTH_LINK_CLASS}>
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm
        onSubmit={login}
        isPending={isPending}
        error={error}
        onErrorReset={reset}
        defaultEmail={defaultEmail}
        showDemoAccounts={USE_MOCKS}
      />
    </AuthCard>
  );
}

export default LoginPage;
