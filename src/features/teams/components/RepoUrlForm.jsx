import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, CardBody, CardHeader, CopyButton, Input, toast } from '@/shared/components/ui';
import { ExternalLink, FolderGit2, GithubIcon, Pencil, Save, ShieldCheck } from '@/shared/icons';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { useUpdateRepo } from '../hooks/useTeamMutations';
import { normalizeRepoUrl, repoUrlSchema } from '../schemas/teamValidation';

function displayRepo(url) {
  return String(url).replace(/^https:\/\/(www\.)?/, '');
}

/**
 * The team's shared GitHub repository (SN11, SD11). The leader can set or edit the URL
 * (https://github.com/<owner>/<repo>); members see it read-only with a copy button.
 * The portal stores only the URL — never credentials.
 */
export function RepoUrlForm({ team, canEdit = false, className }) {
  const repoUrl = team?.repoUrl || '';
  const [editing, setEditing] = useState(false);
  const updateRepo = useUpdateRepo(team?._id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(repoUrlSchema),
    mode: 'onTouched',
    defaultValues: { repoUrl },
  });

  // Keep the form in step with the saved value (after a save or a background refresh).
  useEffect(() => {
    reset({ repoUrl });
  }, [repoUrl, reset]);

  const showForm = canEdit && (editing || !repoUrl);
  const busy = isSubmitting || updateRepo.isPending;

  const onSubmit = async (values) => {
    try {
      await updateRepo.mutateAsync(normalizeRepoUrl(values.repoUrl));
      toast.success(repoUrl ? 'Repository updated' : 'Repository saved', {
        description: 'Everyone on the team can now see it.',
      });
      setEditing(false);
    } catch (error) {
      const fieldMessage = getFieldErrors(error).repoUrl;
      if (fieldMessage) setError('repoUrl', { type: 'server', message: fieldMessage });
      else toast.error("Couldn't save the repository", { description: getErrorMessage(error) });
    }
  };

  const cancelEditing = () => {
    reset({ repoUrl });
    setEditing(false);
  };

  let content;
  if (showForm) {
    content = (
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label="Repository URL"
          required
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/your-team/project"
          leftIcon={GithubIcon}
          hint="The HTTPS address of the repository your team will push to."
          error={errors.repoUrl?.message}
          {...register('repoUrl')}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {editing && repoUrl ? (
            <Button variant="ghost" onClick={cancelEditing} disabled={busy}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" leftIcon={Save} loading={busy}>
            Save repository
          </Button>
        </div>
      </form>
    );
  } else if (repoUrl) {
    content = (
      <div className="space-y-3">
        <div className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <GithubIcon className="h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link min-w-0 flex-1 truncate font-mono text-xs"
          >
            {displayRepo(repoUrl)}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={repoUrl}
            label="Copy URL"
            copiedLabel="URL copied"
            className="h-10 sm:h-8"
          />
          {canEdit ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Pencil}
              className="h-10 sm:h-8"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          ) : null}
        </div>
      </div>
    );
  } else {
    content = (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
        Your team leader hasn't added the shared repository yet.
      </p>
    );
  }

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={FolderGit2}
        title="Shared repository"
        description="One GitHub repository for the whole team's work."
      />
      <CardBody className="space-y-4">
        {content}
        <p className="flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>Never enter a GitHub password in the portal — we only store the repository URL.</span>
        </p>
      </CardBody>
    </Card>
  );
}

export default RepoUrlForm;
