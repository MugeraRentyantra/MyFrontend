import { useId, useState } from 'react';
import { Badge, Card } from '@/shared/components/ui';
import { REVIEW_STATUS } from '@/shared/constants';
import { ExternalLink, GithubIcon, Hourglass, ZoomIn } from '@/shared/icons';
import { formatDateTime } from '@/shared/utils/helpers';
import { DecisionChip } from './DecisionChip';
import { FeedbackBox } from './FeedbackBox';
import { ScreenshotLightbox } from './ScreenshotLightbox';

function SectionLabel({ children }) {
  return (
    <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">{children}</h4>
  );
}

/**
 * One submission attempt (GP9): attempt number, when and by whom it was submitted, the review
 * decision, screenshot thumbnails (open the lightbox), description, GitHub link and feedback.
 */
export function AttemptCard({ submission, isLatest = false, showSubmitter = false }) {
  const headingId = useId();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  if (!submission) return null;

  const screenshots = Array.isArray(submission.screenshots) ? submission.screenshots : [];
  const attemptLabel = `Attempt ${submission.attemptNumber ?? '—'}`;
  const submitter = submission.submittedBy?.name;

  return (
    <Card as="article" padding="none" aria-labelledby={headingId}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            id={headingId}
            className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900"
          >
            {attemptLabel}
            {isLatest ? <Badge variant="brand">Latest</Badge> : null}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Submitted{' '}
            {submission.submittedAt ? (
              <time dateTime={submission.submittedAt}>{formatDateTime(submission.submittedAt)}</time>
            ) : (
              '—'
            )}
            {showSubmitter && submitter ? ` by ${submitter}` : ''}
          </p>
        </div>
        <DecisionChip status={submission.reviewStatus} className="self-start" />
      </div>

      <div className="space-y-5 px-5 py-4">
        {screenshots.length ? (
          <div>
            <SectionLabel>Screenshots ({screenshots.length})</SectionLabel>
            <ul className="mt-2 flex flex-wrap gap-2">
              {screenshots.map((shot, index) => (
                <li key={shot.storageKey ?? `${index}-${shot.name}`}>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Open screenshot ${index + 1} of ${screenshots.length}${shot.name ? `: ${shot.name}` : ''}`}
                    className="group relative block h-20 w-32 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:h-24 sm:w-40"
                  >
                    {shot.url ? (
                      <img
                        src={shot.url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : null}
                    <span
                      className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition duration-150 group-hover:bg-slate-900/40 group-hover:opacity-100 group-focus-visible:bg-slate-900/40 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <SectionLabel>Description</SectionLabel>
          <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
            {submission.description || '—'}
          </p>
        </div>

        {submission.githubUrl ? (
          <div className="min-w-0">
            <SectionLabel>GitHub link</SectionLabel>
            <a
              href={submission.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link mt-1.5 inline-flex max-w-full items-center gap-1.5 text-sm"
            >
              <GithubIcon className="h-4 w-4 shrink-0 text-slate-700" />
              <span className="min-w-0 break-all">{submission.githubUrl}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        ) : null}

        {submission.review ? (
          <FeedbackBox review={submission.review} />
        ) : submission.reviewStatus === REVIEW_STATUS.PENDING ? (
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            <Hourglass className="h-4 w-4 shrink-0 text-violet-500" aria-hidden="true" />
            Waiting for your trainer&apos;s review.
          </p>
        ) : null}
      </div>

      <ScreenshotLightbox
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        screenshots={screenshots}
        index={lightboxIndex ?? 0}
        onIndexChange={setLightboxIndex}
        title={`${attemptLabel} screenshots`}
      />
    </Card>
  );
}

export default AttemptCard;
