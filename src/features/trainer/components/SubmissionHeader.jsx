import { Card, DescriptionList, StatusBadge } from '@/shared/components/ui';
import { REVIEW_STATUS } from '@/shared/constants';
import { formatDateTime, formatRelativeTime } from '@/shared/utils/helpers';
import { isTeamItem, planNameWithDuration, taskLabel } from '../utils/reviewHelpers';
import { AgeBadge } from './AgeBadge';
import { OwnerCell } from './OwnerCell';

/** KD10: who submitted what, which attempt, when, and where the review stands. */
export function SubmissionHeader({ submission }) {
  const team = isTeamItem(submission);
  const isPending = submission.reviewStatus === REVIEW_STATUS.PENDING;

  let ownerSubtitle;
  if (team) {
    ownerSubtitle = submission.submittedBy?.name
      ? `Team · submitted by ${submission.submittedBy.name}`
      : 'Team submission';
  } else {
    ownerSubtitle = submission.student?.email ?? 'Individual submission';
  }

  return (
    <Card as="section" aria-label="Submission details">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <OwnerCell item={submission} secondary={ownerSubtitle} size="md" />
        <StatusBadge status={submission.reviewStatus} size="md" className="self-start" />
      </div>

      <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
        {taskLabel(submission.task)}
      </h2>

      <DescriptionList
        className="mt-4 border-t border-slate-100 pt-4"
        items={[
          { label: 'Attempt', value: <span className="tabular">#{submission.attemptNumber ?? 1}</span> },
          {
            label: 'Submitted',
            value: (
              <span>
                <time dateTime={submission.submittedAt}>{formatDateTime(submission.submittedAt)}</time>
                <span className="text-slate-500"> · {formatRelativeTime(submission.submittedAt)}</span>
              </span>
            ),
          },
          isPending && {
            label: 'Waiting',
            value: <AgeBadge submittedAt={submission.submittedAt} />,
          },
          submission.plan && {
            label: 'Internship',
            value: planNameWithDuration(submission.plan),
          },
        ]}
      />
    </Card>
  );
}

export default SubmissionHeader;
