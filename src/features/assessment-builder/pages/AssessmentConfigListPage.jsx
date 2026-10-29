import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, DataTable, PageHeader, Select, StatCard, StatusBadge } from '@/shared/components/ui';
import { ArrowRight, CheckCircle2, ClipboardCheck, ClipboardList, Pencil, Plus } from '@/shared/icons';
import { ASSESSMENT_QUESTION_COUNT, ROUTES, paths } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { formatDate, formatDateTime, formatNumber } from '@/shared/utils/helpers';
import { useAssessmentConfigs } from '../hooks/useAssessmentBuilder';

const NOT_SET_UP = 'NOT_SET_UP';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: NOT_SET_UP, label: 'Not set up' },
];

const SEARCH_KEYS = ['designationName', 'designation.slug'];

const columns = [
  {
    key: 'designationName',
    header: 'Designation',
    sortable: true,
    className: 'min-w-[12rem]',
    cell: (row) => (
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{row.designationName || '—'}</p>
        {row.designation?.slug ? (
          <p className="font-mono text-xs text-slate-500">{row.designation.slug}</p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'version',
    header: 'Latest version',
    sortable: true,
    className: 'whitespace-nowrap',
    cell: (row) =>
      row.version ? <span className="tabular text-slate-700">v{row.version}</span> : <span className="text-slate-500">—</span>,
  },
  {
    key: 'publishedVersion',
    header: 'Live version',
    sortable: true,
    className: 'whitespace-nowrap',
    cell: (row) =>
      row.publishedVersion ? (
        <Badge variant="success" dot>
          v{row.publishedVersion}
        </Badge>
      ) : (
        <span className="text-slate-500">Not published</span>
      ),
  },
  {
    key: 'questionCount',
    header: 'Questions',
    sortable: true,
    className: 'whitespace-nowrap',
    cell: (row) => {
      const count = Number(row.questionCount) || 0;
      const isFull = count === ASSESSMENT_QUESTION_COUNT;
      return (
        <Badge variant={isFull ? 'success' : 'neutral'} icon={isFull ? CheckCircle2 : undefined}>
          <span className="tabular-nums">
            {count} / {ASSESSMENT_QUESTION_COUNT}
          </span>
        </Badge>
      );
    },
  },
  {
    key: 'statusKey',
    header: 'Status',
    className: 'whitespace-nowrap',
    cell: (row) =>
      row.status ? (
        <StatusBadge status={row.status} />
      ) : (
        <Badge variant="warning" dot>
          Not set up
        </Badge>
      ),
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    sortable: true,
    className: 'whitespace-nowrap',
    cell: (row) =>
      row.updatedAt ? (
        <time dateTime={row.updatedAt} title={formatDateTime(row.updatedAt)} className="text-slate-600">
          {formatDate(row.updatedAt)}
        </time>
      ) : (
        <span className="text-slate-500">—</span>
      ),
  },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    className: 'whitespace-nowrap',
    cell: (row) => {
      const isNew = !row.configId;
      return (
        <Button
          as={Link}
          to={paths.adminAssessment(row.designationId)}
          variant={isNew ? 'secondary' : 'outline'}
          size="sm"
          leftIcon={isNew ? Plus : Pencil}
          className="h-10 sm:h-8"
          aria-label={`${isNew ? 'Set up' : 'Edit'} the ${row.designationName} assessment`}
        >
          {isNew ? 'Set up' : 'Edit'}
        </Button>
      );
    },
  },
];

/**
 * /admin/assessments — every designation with its assessment config: latest and live versions,
 * question count (x / 15), status and last update, linking to the builder (KD5).
 */
export default function AssessmentConfigListPage() {
  useDocumentTitle('Assessments');
  const query = useAssessmentConfigs();
  const [status, setStatus] = useState('');

  const rows = useMemo(
    () =>
      query.data?.map((item) => ({
        ...item,
        designationName: item.designation?.name ?? '',
        statusKey: item.status ?? NOT_SET_UP,
      })),
    [query.data],
  );

  const stats = useMemo(() => {
    if (!rows) return null;
    return {
      live: rows.filter((row) => row.publishedVersion).length,
      drafts: rows.filter((row) => row.status === 'DRAFT').length,
      notSetUp: rows.filter((row) => !row.status).length,
    };
  }, [rows]);

  const statValue = (value) => (stats ? formatNumber(value) : undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Assessments"
        description={`Each designation has one ${ASSESSMENT_QUESTION_COUNT}-question assessment. The score sets the discount on individual enrollments; there is no pass mark, so every score can continue to enrollment.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Live assessments"
          value={statValue(stats?.live)}
          icon={CheckCircle2}
          tone="success"
          hint="Students take these today"
          loading={query.isLoading}
        />
        <StatCard
          label="Drafts in progress"
          value={statValue(stats?.drafts)}
          icon={Pencil}
          tone="warning"
          hint="Saved but not published"
          loading={query.isLoading}
        />
        <StatCard
          label="Not set up"
          value={statValue(stats?.notSetUp)}
          icon={ClipboardList}
          tone="default"
          hint="Designations without questions"
          loading={query.isLoading}
        />
      </div>

      <DataTable
        data={rows}
        loading={query.isFetching}
        error={query.isError ? query.error : null}
        onRetry={() => query.refetch()}
        columns={columns}
        searchKeys={SEARCH_KEYS}
        searchPlaceholder="Search designations…"
        filters={{ statusKey: status }}
        initialSort={{ key: 'designationName', direction: 'asc' }}
        rowKey="designationId"
        caption="Assessments by designation"
        toolbar={
          <Select
            size="sm"
            aria-label="Filter by status"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="w-full sm:w-44"
          />
        }
        emptyState={{
          icon: ClipboardCheck,
          title: 'No designations yet',
          description: 'Create a designation first, then set up its assessment here.',
          action: (
            <Button as={Link} to={ROUTES.ADMIN_DESIGNATIONS} rightIcon={ArrowRight}>
              Go to designations
            </Button>
          ),
        }}
      />
    </div>
  );
}
