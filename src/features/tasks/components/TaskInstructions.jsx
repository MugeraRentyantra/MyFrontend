import { Link } from 'react-router-dom';
import { Badge, Card, CardBody, CardHeader, CopyButton, Prose } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import {
  BookOpen,
  ExternalLink,
  FileText,
  FolderGit2,
  GithubIcon,
  ListChecks,
  Network,
  Target,
  Users,
} from '@/shared/icons';
import { displayUrl, isTeamEnrollment } from '../utils/taskActions';
import { AcceptanceCriteriaList } from './AcceptanceCriteriaList';
import { PrerequisiteList } from './PrerequisiteList';

function TextSection({ title, icon, text, emptyText }) {
  return (
    <Card padding="none">
      <CardHeader title={title} icon={icon} />
      <CardBody>
        {text?.trim() ? (
          <Prose markdown={text} className="prose-sm" />
        ) : (
          <p className="text-sm text-slate-500">{emptyText}</p>
        )}
      </CardBody>
    </Card>
  );
}

function ExternalRepoLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex min-w-0 items-center gap-1.5 break-all text-sm"
    >
      <GithubIcon className="h-4 w-4 shrink-0 text-slate-700" />
      <span className="min-w-0 break-all">{label}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function ResourceRow({ title, children, action }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
        {action}
      </div>
      <div className="mt-1.5 min-w-0">{children}</div>
    </div>
  );
}

/**
 * Instructions tab of the task page (GP6): problem statement, expected outcome, the acceptance
 * criteria self-check, starter repository, team repository (team enrollments), the day's SOP and
 * the prerequisites.
 */
export function TaskInstructions({ content, checked, onToggleCriterion }) {
  const { task = {}, team, enrollment, progress } = content ?? {};
  const isTeam = isTeamEnrollment(enrollment);
  const hasDay = task.dayNumber !== null && task.dayNumber !== undefined;
  const prerequisites = Array.isArray(progress?.prerequisites) ? progress.prerequisites : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <TextSection
          title="Problem statement"
          icon={FileText}
          text={task.problemStatement}
          emptyText="No problem statement was provided for this task."
        />
        <TextSection
          title="Expected outcome"
          icon={Target}
          text={task.expectedOutcome}
          emptyText="No expected outcome was provided for this task."
        />
        <Card padding="none">
          <CardHeader
            title="Acceptance criteria"
            icon={ListChecks}
            description="Tick each item as you check your work before submitting."
            action={<Badge variant="neutral">Self-check, not saved</Badge>}
          />
          <CardBody>
            <AcceptanceCriteriaList
              criteria={task.acceptanceCriteria}
              checked={checked}
              onToggle={onToggleCriterion}
            />
          </CardBody>
        </Card>
      </div>

      <div className="min-w-0 space-y-6">
        <Card padding="none">
          <CardHeader title="Resources" icon={FolderGit2} />
          <CardBody className="space-y-5">
            <ResourceRow
              title="Starter repository"
              action={
                task.starterRepoUrl ? (
                  <CopyButton
                    value={task.starterRepoUrl}
                    iconOnly
                    variant="ghost"
                    label="Copy starter repository URL"
                  />
                ) : null
              }
            >
              {task.starterRepoUrl ? (
                <ExternalRepoLink href={task.starterRepoUrl} label={displayUrl(task.starterRepoUrl)} />
              ) : (
                <p className="text-sm text-slate-500">No starter code for this task.</p>
              )}
            </ResourceRow>

            {isTeam ? (
              <ResourceRow
                title={team?.name ? `Team repository · ${team.name}` : 'Team repository'}
                action={
                  team?.repoUrl ? (
                    <CopyButton
                      value={team.repoUrl}
                      iconOnly
                      variant="ghost"
                      label="Copy team repository URL"
                    />
                  ) : null
                }
              >
                {team?.repoUrl ? (
                  <ExternalRepoLink href={team.repoUrl} label={displayUrl(team.repoUrl)} />
                ) : (
                  <p className="text-sm text-slate-500">
                    Your team leader hasn&apos;t added the repository yet.
                    {team?._id ? (
                      <>
                        {' '}
                        <Link to={paths.team(team._id)} className="link">
                          Open team page
                        </Link>
                      </>
                    ) : null}
                  </p>
                )}
              </ResourceRow>
            ) : null}

            {hasDay ? (
              <ResourceRow title={`Day ${task.dayNumber} guide`}>
                <Link
                  to={paths.sop(task.dayNumber)}
                  className="link inline-flex items-center gap-1.5 text-sm"
                >
                  <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Read the Day {task.dayNumber} SOP
                </Link>
              </ResourceRow>
            ) : null}

            {isTeam && team?._id ? (
              <ResourceRow title="Team">
                <Link
                  to={paths.team(team._id)}
                  className="link inline-flex items-center gap-1.5 text-sm"
                >
                  <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {team.name || 'Your team'}
                </Link>
              </ResourceRow>
            ) : null}
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader
            title="Prerequisites"
            icon={Network}
            description={prerequisites.length ? 'Tasks that had to be approved first.' : undefined}
          />
          <CardBody>
            <PrerequisiteList prerequisites={prerequisites} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default TaskInstructions;
