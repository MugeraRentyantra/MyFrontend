/**
 * Auth feature public API (SN3, SN4). Route pages are lazy-loaded from their own files
 * (src/routes/lazyPages.js) and are deliberately not re-exported here.
 */
export { AuthCard } from './components/AuthCard';
export { AuthErrorBanner } from './components/AuthErrorBanner';
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { ForgotPasswordForm } from './components/ForgotPasswordForm';
export { ResetPasswordForm } from './components/ResetPasswordForm';
export { ResendVerificationForm } from './components/ResendVerificationForm';
export { PasswordRules } from './components/PasswordRules';

export { useLogin } from './hooks/useLogin';
export { useRegister } from './hooks/useRegister';
export { useVerifyEmail } from './hooks/useVerifyEmail';
export { useForgotPassword, useResetPassword } from './hooks/usePasswordReset';
export { useResendVerification, RESEND_COOLDOWN_SECONDS } from './hooks/useResendVerification';
export { useCooldown } from './hooks/useCooldown';

export {
  PASSWORD_RULES,
  getPasswordRuleResults,
  isPasswordStrongEnough,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendSchema,
} from './schemas/authValidation';

export {
  AUTH_ERROR_CODES,
  describeAuthError,
  describeLoginError,
  getTokenErrorKind,
} from './utils/authErrors';
