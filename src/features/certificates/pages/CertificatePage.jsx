import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  SkeletonCard,
  StatusBadge,
  StatusBanner,
} from '@/shared/components/ui';
import {
  ArrowRight,
  Award,
  FileCheck2,
  Globe,
  Mail,
  PartyPopper,
  ShieldAlert,
} from '@/shared/icons';
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import {
  CERTIFICATE_STATUS,
  ENROLLMENT_STATUS,
  ROUTES,
  SUPPORT_EMAIL,
} from '@/shared/constants';
import { formatDate, formatDuration } from '@/shared/utils/helpers';
import { CertificateCard } from '../components/CertificateCard';
import { CertificatePreview } from '../components/CertificatePreview';
import { EligibilityChecklist } from '../components/EligibilityChecklist';
import { findCertificateForEnrollment, useMyCertificates } from '../hooks/useMyCertificates';

function enrollmentTitle(enrollment) {
  const plan = enrollment?.plan;
  return (
    [plan?.designation?.name, plan?.domain?.name].filter(Boolean).join(' · ') || 'Internship'
  );
}

function enrollmentOptionLabel(enrollment) {
  const months = enrollment?.plan?.durationMonths;
  return months
    ? `${enrollmentTitle(enrollment)} (${formatDuration(months)})`
    : enrollmentTitle(enrollment);
}

const BENEFITS = [
  {
    icon: FileCheck2,
    title: 'A PDF certificate',
    text: 'With your name, the programme, the issue date and a unique number.',
  },
  {
    icon: Globe,
    title: 'A public verification page',
    text: 'Employers can confirm it is genuine without seeing your personal details.',
  },
  {
    icon: Mail,
    title: 'A copy in your inbox',
    text: 'We email it to you the moment it is issued.',
  },
];

function WhatYouGet({ className }) {
  return (
    <Card padding="none" className={className}>
      <CardHeader icon={Award} title="What you'll receive" />
      <CardBody>
        <ul className="space-y-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" role="status">
      <span className="sr-only">Loading your certificate…</span>
      <SkeletonCard lines={4} />
      <SkeletonCard lines={6} />
    </div>
  );
}

/**
 * /certificate (GP12): the active enrollment's certificate. Before issue it explains the
 * remaining requirements; once issued it offers the PDF, the verification link and a preview.
 */
export default function CertificatePage() {
  useDocumentTitle('Certificate');
  const {
    enrollment,
    enrollments,
    isLoading,
    isError,
    error,
    refetch,
    setActiveEnrollmentId,
  } = useActiveEnrollment();
  const certificatesQuery = useMyCertificates();

  const certificate = useMemo(
    () => findCertificateForEnrollment(certificatesQuery.data, enrollment),
    [certificatesQuery.data, enrollment],
  );

  const switcher =
    enrollments.length > 1 && enrollment ? (
      <Select
        aria-label="Choose an internship"
        value={enrollment._id}
        onChange={(event) => setActiveEnrollmentId(event.target.value)}
        options={enrollments.map((item) => ({
          value: item._id,
          label: enrollmentOptionLabel(item),
        }))}
        className="w-full sm:w-72"
      />
    ) : null;

  let content;
  if (isLoading || (enrollment && certificatesQuery.isLoading)) {
    content = <LoadingState />;
  } else if (isError) {
    content = <ErrorState error={error} onRetry={() => refetch()} />;
  } else if (!enrollment) {
    content = (
      <EmptyState
        icon={Award}
        title="No internship yet"
        description="Enroll in an internship and complete its tasks to earn a verifiable certificate."
        action={
          <Button as={Link} to={ROUTES.CATALOG} rightIcon={ArrowRight}>
            Browse internships
          </Button>
        }
      />
    );
  } else if (certificatesQuery.isError) {
    content = (
      <ErrorState
        title="Couldn't load your certificate"
        error={certificatesQuery.error}
        onRetry={() => certificatesQuery.refetch()}
      />
    );
  } else if (certificate && certificate.status === CERTIFICATE_STATUS.REVOKED) {
    content = (
      <>
        <StatusBanner variant="error" icon={ShieldAlert} title="This certificate has been revoked">
          {certificate.revokedAt ? `Revoked on ${formatDate(certificate.revokedAt)}. ` : ''}
          {certificate.revokeReason ? `Reason: ${certificate.revokeReason}. ` : ''}
          It is no longer valid and public verification shows it as revoked. If you think this is a
          mistake, contact {SUPPORT_EMAIL}.
        </StatusBanner>
        <CertificateCard certificate={certificate} />
      </>
    );
  } else if (certificate) {
    content = (
      <>
        <StatusBanner variant="success" icon={PartyPopper} title="Your certificate is ready">
          Download it, add it to your résumé or share the verification link with employers.
        </StatusBanner>
        <CertificateCard certificate={certificate} />
        <CertificatePreview certificate={certificate} />
      </>
    );
  } else {
    const inactive =
      enrollment.status === ENROLLMENT_STATUS.CANCELLED ||
      enrollment.status === ENROLLMENT_STATUS.SUSPENDED;
    content = (
      <>
        {inactive ? (
          <StatusBanner
            variant="warning"
            title={`This enrollment is ${enrollment.status === ENROLLMENT_STATUS.CANCELLED ? 'cancelled' : 'suspended'}`}
          >
            Certificates are issued only for active internships. Contact {SUPPORT_EMAIL} if you
            have questions.
          </StatusBanner>
        ) : null}
        {enrollment.status === ENROLLMENT_STATUS.COMPLETED ? (
          <StatusBanner variant="info" title="Your certificate is being issued">
            Every requirement is met. It will appear here and in your inbox shortly.
          </StatusBanner>
        ) : null}
        <div className="grid gap-6 xl:grid-cols-3">
          <EligibilityChecklist enrollment={enrollment} className="xl:col-span-2" />
          <WhatYouGet />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate"
        description={
          enrollment ? (
            <span className="flex flex-wrap items-center gap-2">
              <span>
                For <span className="font-medium text-slate-700">{enrollmentTitle(enrollment)}</span>
                {enrollment.plan?.durationMonths
                  ? ` · ${formatDuration(enrollment.plan.durationMonths)}`
                  : ''}
              </span>
              <StatusBadge status={enrollment.status} />
            </span>
          ) : (
            'Your internship certificate, ready to download and share once it is issued.'
          )
        }
        actions={switcher}
      />
      {content}
    </div>
  );
}
