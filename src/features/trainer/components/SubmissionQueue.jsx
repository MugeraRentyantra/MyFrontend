import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, DataTable } from '@/shared/components/ui';
import { PAGE_SIZE_OPTIONS, paths } from '@/shared/constants';
import { CheckCheck } from '@/shared/icons';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { useSubmissionQueue } from '../hooks/useSubmissionQueue';
import { ownerName, taskLabel } from '../utils/reviewHelpers';
import { AgeBadge } from './AgeBadge';
import { OwnerCell } from './OwnerCell';

/**
 * KD9 review queue: pending submissions from the trainer's students and teams, oldest first.
 * Selecting a row (or its Review link) opens the review screen.
 */
export function SubmissionQueue({ className }) {
  const navigate = useNavigate();
  const { fetcher, queryKey, queryOptions } = useSubmissionQueue();

  const columns = useMemo(
    () => [
      {
        key: 'age',
        header: 'Waiting',
        cell: (row) => <AgeBadge submittedAt={row.submittedAt} />,
      },
      {
        key: 'owner',
        header: 'Student or team',
        className: 'min-w-[14rem]',
        cell: (row) => <OwnerCell item={row} />,
      },
      {
        key: 'task',
        header: 'Task',
        className: 'min-w-[14rem]',
        cell: (row) => <span className="font-medium text-slate-900">{taskLabel(row.task)}</span>,
      },
      {
        key: 'attemptNumber',
        header: 'Attempt',
        align: 'right',
        cell: (row) => <span className="tabular text-slate-700">#{row.attemptNumber ?? 1}</span>,
      },
      {
        key: 'submittedAt',
        header: 'Submitted',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <time dateTime={row.submittedAt} title={formatDateTime(row.submittedAt)}>
            {formatRelativeTime(row.submittedAt)}
          </time>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        cell: (row) => (
          <Button as={Link} to={paths.trainerReview(row._id)} variant="outline" size="sm">
            Review
            <span className="sr-only">
              {' '}
              {taskLabel(row.task)} from {ownerName(row)}
            </span>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable
      className={className}
      columns={columns}
      fetcher={fetcher}
      queryKey={queryKey}
      queryOptions={queryOptions}
      searchPlaceholder="Search student, team or task…"
      pageSize={10}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      caption="Submissions waiting for your review, oldest first"
      onRowClick={(row) => navigate(paths.trainerReview(row._id))}
      emptyState={{
        icon: CheckCheck,
        title: "You're all caught up",
        description:
          'Nothing is waiting for review. New submissions from your students and teams will appear here.',
      }}
    />
  );
}

export default SubmissionQueue;
