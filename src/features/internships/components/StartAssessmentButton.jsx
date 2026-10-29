import { Link } from 'react-router-dom';
import { Button, Tooltip } from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import { ROLES, paths } from '@/shared/constants';
import { ArrowRight, ClipboardCheck, ListChecks, LogIn, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { useMyAttempt } from '@/features/assessment/hooks/useMyAttempt';

const STUDENTS_ONLY_MESSAGE = 'Only student accounts can take assessments and enroll.';

/** A focusable, visibly disabled button whose reason is available on hover and focus. */
function UnavailableButton({ children, size, variant = 'primary', leftIcon, className }) {
  return (
    <Tooltip content={STUDENTS_ONLY_MESSAGE}>
      <Button
        size={size}
        variant={variant}
        leftIcon={leftIcon}
        aria-disabled="true"
        className={className}
        onClick={(event) => event.preventDefault()}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

/**
 * Primary CTA of a designation (SN5 -> SN6):
 * - signed out: "Start assessment" -> register (then back to the assessment) + "I already have an account";
 * - student without an attempt: "Start assessment";
 * - student with an attempt: "View your result" (+ "Choose your plan");
 * - trainer/admin: disabled with an explanation.
 */
export function StartAssessmentButton({
  designationId,
  size = 'lg',
  showSecondary = true,
  className,
}) {
  const { isAuthenticated, isLoading: authLoading, hasRole } = useAuth();
  const isStudent = isAuthenticated && hasRole(ROLES.STUDENT);
  const attemptQuery = useMyAttempt(designationId, { enabled: isStudent });
  const assessmentPath = paths.assessment(designationId);

  const wrapperClass = cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className);

  if (authLoading || (isStudent && attemptQuery.isLoading)) {
    return (
      <div className={wrapperClass}>
        <Button size={size} loading>
          Checking your progress…
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={wrapperClass}>
        <Button
          as={Link}
          to={paths.register(assessmentPath)}
          size={size}
          rightIcon={ArrowRight}
        >
          Start assessment
        </Button>
        {showSecondary ? (
          <Button
            as={Link}
            to={paths.login(assessmentPath)}
            size={size}
            variant="outline"
            leftIcon={LogIn}
          >
            I already have an account
          </Button>
        ) : null}
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <div className="flex flex-wrap items-center gap-3">
          <UnavailableButton size={size} leftIcon={ListChecks}>
            Start assessment
          </UnavailableButton>
        </div>
        <p className="text-sm text-slate-500">{STUDENTS_ONLY_MESSAGE}</p>
      </div>
    );
  }

  const attempt = attemptQuery.data;
  if (attempt) {
    return (
      <div className={wrapperClass}>
        <Button
          as={Link}
          to={paths.assessmentResult(designationId)}
          size={size}
          leftIcon={ClipboardCheck}
        >
          View your result
        </Button>
        {showSecondary ? (
          <Button
            as={Link}
            to={paths.enroll({ designationId })}
            size={size}
            variant="outline"
            rightIcon={ArrowRight}
          >
            Choose your plan
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <Button as={Link} to={assessmentPath} size={size} rightIcon={ArrowRight}>
        Start assessment
      </Button>
    </div>
  );
}

/**
 * Secondary CTA: start a team for this designation (SN10). Signed-out visitors register first and
 * come back to the team form; non-students see it disabled.
 */
export function JoinTeamButton({ designationId, planId, size = 'lg', variant = 'outline', className }) {
  const { isAuthenticated, isLoading: authLoading, hasRole } = useAuth();
  const teamPath = paths.teamNew({ designationId, planId });

  if (authLoading) {
    return (
      <Button size={size} variant={variant} leftIcon={Users} disabled className={className}>
        Join as a team
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        as={Link}
        to={paths.register(teamPath)}
        size={size}
        variant={variant}
        leftIcon={Users}
        className={className}
      >
        Join as a team
      </Button>
    );
  }

  if (!hasRole(ROLES.STUDENT)) {
    return (
      <UnavailableButton size={size} variant={variant} leftIcon={Users} className={className}>
        Join as a team
      </UnavailableButton>
    );
  }

  return (
    <Button
      as={Link}
      to={teamPath}
      size={size}
      variant={variant}
      leftIcon={Users}
      className={className}
    >
      Join as a team
    </Button>
  );
}

export default StartAssessmentButton;
