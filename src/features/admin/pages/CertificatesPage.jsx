import { useMemo, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  DataTable,
  PageHeader,
  StatusBadge,
  Tabs,
  toast,
} from '@/shared/components/ui';
import { Award, Send } from '@/shared/icons';
import { CERTIFICATE_STATUS, PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useDocumentTitle } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDate, formatDuration } from '@/shared/utils/helpers';
import { ClearFiltersButton } from '../components/ClearFiltersButton';
import { FilterSelect } from '../components/FilterSelect';
import { PersonCell } from '../components/PersonCell';
import { CERTIFICATE_STATUS_OPTIONS, EMAIL_STATUS_TABS } from '../constants';
import {
  fetchAdminCertificates,
  hasPendingEmail,
  useResendCertificateEmail,
} from '../hooks/useAdminCertificates';
import { useUrlFilters } from '../hooks/useUrlFilters';

const FILTER_KEYS = ['emailStatus', 'status'];
const INITIAL_SORT = { key: 'issuedAt', direction: 'desc' };
/** After a resend, poll briefly so the email status settles (PENDING → SENT) without a manual refresh. */
const POLL_WINDOW_MS = 20 * 1000;
const POLL_INTERVAL_MS = 2500;

function studentOf(certificate) {
  return certificate.student ?? { name: certificate.studentName };
}

/** KD12 certificate monitoring: email delivery status and "Resend email" (never issues a new certificate). */
export function CertificatesPage() {
  useDocumentTitle('Certificates');
  const { values, setValue, clear, activeCount } = useUrlFilters(FILTER_KEYS);
  const [resendTarget, setResendTarget] = useState(null);
  const [pollUntil, setPollUntil] = useState(0);
  const resend = useResendCertificateEmail();

  const filters = useMemo(
    () => ({ emailStatus: values.emailStatus, status: values.status }),
    [values.emailStatus, values.status],
  );

  const queryOptions = {
    refetchInterval: (query) =>
      Date.now() < pollUntil && hasPendingEmail(query.state.data) ? POLL_INTERVAL_MS : false,
  };

  const columns = useMemo(
    () => [
      {
        key: 'certificateNo',
        header: 'Certificate',
        sortable: true,
        cell: (certificate) => (
          <span className="whitespace-nowrap font-mono text-xs text-slate-900">{certificate.certificateNo}</span>
        ),
      },
      {
        key: 'student',
        header: 'Student',
        cell: (certificate) => <PersonCell person={studentOf(certificate)} avatarSize="xs" />,
      },
      {
        key: 'designation',
        header: 'Internship',
        cell: (certificate) => (
          <div className="min-w-0 max-w-[16rem]">
            <p className="truncate font-medium text-slate-900">
              {certificate.designation?.name || 'Unknown designation'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {[
                certificate.domain?.name,
                certificate.durationMonths ? formatDuration(certificate.durationMonths) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ),
      },
      {
        key: 'issuedAt',
        header: 'Issued',
        sortable: true,
        cell: (certificate) => (
          <span className="whitespace-nowrap text-slate-600">{formatDate(certificate.issuedAt)}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (certificate) => <StatusBadge status={certificate.status} />,
      },
      {
        key: 'emailStatus',
        header: 'Email',
        cell: (certificate) =>
          certificate.emailStatus ? (
            <StatusBadge status={certificate.emailStatus} />
          ) : (
            <span className="text-sm text-slate-500">—</span>
          ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (certificate) => {
          if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
            return (
              <span className="whitespace-nowrap text-xs text-slate-500">
                Not available<span className="sr-only"> for a revoked certificate</span>
              </span>
            );
          }
          const name = studentOf(certificate).name || 'the student';
          return (
            <Button
              variant="outline"
              size="sm"
              leftIcon={Send}
              onClick={() => setResendTarget(certificate)}
              aria-label={`Resend certificate ${certificate.certificateNo} to ${name}`}
            >
              Resend email
            </Button>
          );
        },
      },
    ],
    [],
  );

  const target = resendTarget;
  const targetStudent = target ? studentOf(target) : null;

  const handleResend = async () => {
    if (!target || resend.isPending) return;
    try {
      await resend.mutateAsync(target._id);
      setPollUntil(Date.now() + POLL_WINDOW_MS);
      toast.success('Certificate email queued', {
        description: targetStudent?.email
          ? `It will be sent to ${targetStudent.email} in a moment.`
          : 'It will be sent in a moment.',
      });
      setResendTarget(null);
    } catch (error) {
      toast.error("The email wasn't queued", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificates"
        description="Issued certificates and whether their email reached the student. Resending an email never creates a new certificate."
      >
        <Tabs
          variant="pills"
          aria-label="Filter by email status"
          items={EMAIL_STATUS_TABS}
          value={values.emailStatus}
          onChange={(value) => setValue('emailStatus', value)}
        />
      </PageHeader>

      <DataTable
        fetcher={fetchAdminCertificates}
        queryKey={queryKeys.admin.certificates}
        queryOptions={queryOptions}
        filters={filters}
        columns={columns}
        initialSort={INITIAL_SORT}
        searchPlaceholder="Search certificate no. or student…"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Certificates"
        toolbar={
          <>
            <FilterSelect
              label="Filter by certificate status"
              allLabel="Issued and revoked"
              value={values.status}
              onChange={(value) => setValue('status', value)}
              options={CERTIFICATE_STATUS_OPTIONS}
            />
            <ClearFiltersButton count={activeCount} onClear={() => clear()} />
          </>
        }
        emptyState={{
          icon: Award,
          title: 'No certificates yet',
          description: 'Certificates are issued automatically when a student completes every task.',
        }}
      />

      <ConfirmDialog
        open={Boolean(resendTarget)}
        onClose={() => setResendTarget(null)}
        onConfirm={handleResend}
        title="Resend certificate email?"
        message={
          target ? (
            <>
              We'll email certificate <span className="font-mono text-slate-900">{target.certificateNo}</span> to{' '}
              {targetStudent?.name || 'the student'}
              {targetStudent?.email ? ` at ${targetStudent.email}` : ''} again. The certificate itself does not
              change and no new certificate is issued.
            </>
          ) : null
        }
        confirmLabel="Resend email"
        loading={resend.isPending}
      />
    </div>
  );
}

export default CertificatesPage;
