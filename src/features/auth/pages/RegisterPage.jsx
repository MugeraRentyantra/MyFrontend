import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks';
import { paths } from '@/shared/constants';
import { AuthCard } from '../components/AuthCard';
import { RegisterForm } from '../components/RegisterForm';
import { AUTH_LINK_CLASS } from '../components/authStyles';
import { useRegister } from '../hooks/useRegister';

/** /register (SN3) — guest only; keeps ?redirect= for the log-in step after verification. */
export function RegisterPage() {
  useDocumentTitle('Create your account');
  const { registerAccount, isPending, redirectTo } = useRegister();
  const loginTo = paths.login(redirectTo);

  return (
    <AuthCard
      title="Create your account"
      description="Take a short assessment, unlock your merit discount and start building real projects."
      footer={
        <>
          Already have an account?{' '}
          <Link to={loginTo} className={AUTH_LINK_CLASS}>
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm onSubmit={registerAccount} isPending={isPending} loginTo={loginTo} />
    </AuthCard>
  );
}

export default RegisterPage;
