import { Badge, DescriptionList } from '@/shared/components/ui';
import { ExternalLink, UserCheck } from '@/shared/icons';
import { dayLabel, formatHours } from '../utils/format';

function TextBlock({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-1.5 whitespace-pre-line break-words text-sm text-slate-800">{children}</div>
    </section>
  );
}

/** Read-only view of a task definition (published / archived versions). */
export function TaskDetails({ task, tasks = [], days = [] }) {
  const byId = new Map(tasks.map((item) => [item._id, item]));
  const day = days.find((item) => item.dayNumber === task.dayNumber);
  const prerequisites = (task.prerequisiteTaskIds ?? []).map((id) => byId.get(id)).filter(Boolean);
  const criteria = Array.isArray(task.acceptanceCriteria) ? task.acceptanceCriteria : [];

  return (
    <div className="space-y-6">
      <TextBlock title="Problem statement">{task.problemStatement || '—'}</TextBlock>
      <TextBlock title="Expected outcome">{task.expectedOutcome || '—'}</TextBlock>

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Acceptance criteria
        </h3>
        {criteria.length > 0 ? (
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-800 marker:text-slate-400">
            {/* Criteria are plain strings without ids; their order is stable in this view. */}
            {criteria.map((criterion, index) => (
              <li key={index} className="break-words pl-1">
                {criterion}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1.5 text-sm text-slate-500">None listed.</p>
        )}
      </section>

      <DescriptionList
        items={[
          { label: 'Estimated effort', value: formatHours(task.estimatedHours) },
          { label: 'Schedule day', value: day ? dayLabel(day) : task.dayNumber ? `Day ${task.dayNumber}` : 'Not tied to a day' },
          {
            label: 'Review',
            value: task.requiresTrainerReview ? (
              <Badge variant="brand" icon={UserCheck}>
                Trainer review required
              </Badge>
            ) : (
              'No trainer review'
            ),
          },
          {
            label: 'Starter repository',
            value: task.starterRepoUrl ? (
              <a
                href={task.starterRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link inline-flex max-w-full items-center gap-1 break-all"
              >
                {task.starterRepoUrl.replace(/^https:\/\//, '')}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              'None'
            ),
          },
          {
            label: 'Prerequisites',
            span: 2,
            value:
              prerequisites.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {prerequisites.map((item) => (
                    <li
                      key={item._id}
                      className="max-w-full truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                    >
                      <span className="tabular">#{item.sequence}</span> {item.title}
                    </li>
                  ))}
                </ul>
              ) : (
                'None. Available from the start.'
              ),
          },
        ]}
      />
    </div>
  );
}

export default TaskDetails;
