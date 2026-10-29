import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  EmptyState,
  ErrorState,
  ProgressBar,
  SkeletonText,
  StatusBadge,
} from '@/shared/components/ui';
import {
  ArrowRight,
  Award,
  Briefcase,
  ClipboardCheck,
  ExternalLink,
  Percent,
} from '@/shared/icons';
import { useEnrollments } from '@/features/applications/hooks/useApplications';
import { useMyCertificates } from '@/features/certificates/hooks/useMyCertificates';
import { ASSESSMENT_MAX_SCORE, ENROLLMENT_TYPE, ROUTES, paths } from '@/shared/constants';
import { formatDate, formatDuration } from '@/shared/utils/helpers';
import { useMyAttempts } from '../hooks/useProfile';

function joinParts(parts) {
  return parts.filter(Boolean).join(' · ');
}

function planTitle(plan) {
  return joinParts([plan?.designation?.name, plan?.domain?.name]) || 'Internship';
}

/** One record group: owns its loading, error and empty states. */
function RecordCard({ icon, title, description, query, count, emptyState, footer, children, className }) {
  let body;
  if (query.isLoading) {
    body = (
      <div role="status">
        <span className="sr-only">Loading {title.toLowerCase()}…</span>
        <SkeletonText lines={4} />
      </div>
    );
  } else if (query.isError) {
    body = <ErrorState compact error={query.error} onRetry={() => query.refetch()} />;
  } else if (!count) {
    body = <EmptyState compact variant="muted" titleAs="h4" {...emptyState} />;
  } else {
    body = children;
  }

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={icon}
        title={title}
        titleAs="h3"
        description={description}
        action={count ? <Badge variant="neutral">{count}</Badge> : null}
      />
      <CardBody>{body}</CardBody>
      {footer && count ? <CardFooter>{footer}</CardFooter> : null}
    </Card>
  );
}

function EnrollmentRow({ enrollment }) {
  const plan = enrollment.plan;
  const approved = Number(enrollment.progress?.approved ?? 0);
  const total = Number(enrollment.progress?.total ?? 0);
  const typeLabel =
    enrollment.enrollmentType === ENROLLMENT_TYPE.TEAM
      ? joinParts(['Team', enrollment.team?.name])
      : 'Individual';

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-slate-900">{planTitle(plan)}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {joinParts([
              plan?.durationMonths ? formatDuration(plan.durationMonths) : null,
              typeLabel,
              `Enrolled ${formatDate(enrollment.createdAt)}`,
            ])}
          </p>
        </div>
        <StatusBadge status={enrollment.status} className="self-start" />
      </div>
      {total > 0 ? (
        <ProgressBar
          className="mt-3 max-w-md"
          size="sm"
          value={approved}
          max={total}
          variant={approved >= total ? 'success' : 'brand'}
          label={
            <span className="text-xs font-normal text-slate-500">
              {approved} of {total} tasks approved
            </span>
          }
        />
      ) : null}
    </li>
  );
}

function AttemptRow({ attempt }) {
  const discount = Number(attempt.discountPercent ?? 0);
  const total = attempt.totalQuestions ?? ASSESSMENT_MAX_SCORE;
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-900">
          {attempt.designation?.name ?? 'Assessment'}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">Taken {formatDate(attempt.submittedAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-sm font-medium text-slate-900">
          Score {attempt.score ?? '—'}/{total}
        </span>
        {discount > 0 ? (
          <Badge variant="brand" icon={Percent}>
            {discount}% discount
          </Badge>
        ) : (
          <Badge variant="neutral">No discount</Badge>
        )}
      </div>
    </li>
  );
}

function CertificateRow({ certificate }) {
  const number = certificate.certificateNo;
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="break-all font-mono text-sm font-medium text-slate-900">{number}</p>
        <p className="mt-0.5 text-sm text-slate-500">
          {joinParts([
            planTitle(certificate),
            certificate.issuedAt ? `Issued ${formatDate(certificate.issuedAt)}` : null,
          ])}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={certificate.status} />
        {number ? (
          <Button
            as={Link}
            to={paths.verifyCertificate(number)}
            target="_blank"
            rel="noopener noreferrer"
            variant="ghost"
            size="sm"
            rightIcon={ExternalLink}
          >
            Verify
            <span className="sr-only"> certificate {number} (opens in a new tab)</span>
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The student's internship record ("resume", GP11): assessment attempts with score and
 * discount, enrollments with their status and progress, and certificates earned.
 */
export function ResumeSection({ className }) {
  const enrollmentsQuery = useEnrollments();
  const attemptsQuery = useMyAttempts();
  const certificatesQuery = useMyCertificates();

  const enrollments = Array.isArray(enrollmentsQuery.data) ? enrollmentsQuery.data : [];
  const attempts = Array.isArray(attemptsQuery.data) ? attemptsQuery.data : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];

  return (
    <section aria-labelledby="internship-record-heading" className={className}>
      <div className="mb-4">
        <h2
          id="internship-record-heading"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          Internship record
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Your assessments, internships and certificates in one place.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RecordCard
          className="xl:col-span-2"
          icon={Briefcase}
          title="Internships"
          description="Every internship you have enrolled in, with its status and progress."
          query={enrollmentsQuery}
          count={enrollments.length}
          emptyState={{
            icon: Briefcase,
            title: 'No internships yet',
            description: 'Pick a designation, take the short assessment and choose a plan.',
            action: (
              <Button as={Link} to={ROUTES.CATALOG} size="sm" rightIcon={ArrowRight}>
                Browse internships
              </Button>
            ),
          }}
        >
          <ul className="divide-y divide-slate-100">
            {enrollments.map((enrollment) => (
              <EnrollmentRow key={enrollment._id} enrollment={enrollment} />
            ))}
          </ul>
        </RecordCard>

        <RecordCard
          icon={ClipboardCheck}
          title="Assessments"
          description="Your scores and the discounts they earned on individual plans."
          query={attemptsQuery}
          count={attempts.length}
          emptyState={{
            icon: ClipboardCheck,
            title: 'No assessments taken',
            description: 'Each internship starts with a short 15-question assessment.',
          }}
        >
          <ul className="divide-y divide-slate-100">
            {attempts.map((attempt) => (
              <AttemptRow key={attempt._id} attempt={attempt} />
            ))}
          </ul>
        </RecordCard>

        <RecordCard
          icon={Award}
          title="Certificates"
          description="Certificates you have earned, each with a public verification page."
          query={certificatesQuery}
          count={certificates.length}
          emptyState={{
            icon: Award,
            title: 'No certificates yet',
            description: 'Your certificate is issued once every task in an internship is approved.',
          }}
          footer={
            <Button as={Link} to={ROUTES.CERTIFICATE} variant="outline" size="sm" rightIcon={ArrowRight}>
              Go to certificate page
            </Button>
          }
        >
          <ul className="divide-y divide-slate-100">
            {certificates.map((certificate) => (
              <CertificateRow key={certificate._id} certificate={certificate} />
            ))}
          </ul>
        </RecordCard>
      </div>
    </section>
  );
}

export default ResumeSection;
