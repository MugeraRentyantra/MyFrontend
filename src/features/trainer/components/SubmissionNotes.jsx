import { Card, CardBody, CardHeader, CopyButton } from '@/shared/components/ui';
import { ExternalLink, GithubIcon } from '@/shared/icons';

/** Only real https links are rendered as links (never javascript: or data: URLs). */
function isSafeHttpsUrl(value) {
  try {
    return new URL(String(value)).protocol === 'https:';
  } catch {
    return false;
  }
}

/** A GitHub link that opens in a new tab, plus a copy button. */
export function GithubLink({ url, className }) {
  if (!url) {
    return <p className="text-sm text-slate-500">No GitHub link was provided.</p>;
  }
  if (!isSafeHttpsUrl(url)) {
    return <p className="break-all font-mono text-xs text-slate-700">{url}</p>;
  }
  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex min-h-[2.5rem] min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:flex-1"
        >
          <GithubIcon className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
          <span className="min-w-0 truncate font-mono text-xs">{url.replace(/^https:\/\//, '')}</span>
          <ExternalLink
            className="ml-auto h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600"
            aria-hidden="true"
          />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <CopyButton value={url} label="Copy link" size="md" className="self-start sm:self-auto" />
      </div>
    </div>
  );
}

/** KD10: the student's description (line breaks kept) and their GitHub link. */
export function SubmissionNotes({ description, githubUrl }) {
  const text = String(description ?? '').trim();
  return (
    <Card as="section" padding="none" aria-label="Description and code">
      <CardHeader title="What the student did" description="Their description and the code to review." />
      <CardBody className="space-y-5">
        {text ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{text}</p>
        ) : (
          <p className="text-sm text-slate-500">No description was provided.</p>
        )}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">GitHub</h3>
          <GithubLink url={githubUrl} />
        </div>
      </CardBody>
    </Card>
  );
}

export default SubmissionNotes;
