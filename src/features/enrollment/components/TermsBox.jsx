import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ErrorState,
  SkeletonText,
} from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { ExternalLink, ScrollText } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDate } from '@/shared/utils/helpers';
import { TermsContent } from './TermsContent';

const END_THRESHOLD_PX = 12;

/**
 * Terms & Conditions acceptance on /enroll (SN8, SD5): the latest terms in a scrollable,
 * keyboard-focusable region with version and date, plus the acceptance checkbox.
 *
 * Props: `terms` ({ version, content, publishedAt }), `isLoading`, `error`, `onRetry`,
 * `accepted`, `onAcceptedChange(bool)`, `disabled`, `title`, `description`, `className`.
 */
export function TermsBox({
  terms,
  isLoading = false,
  error = null,
  onRetry,
  accepted = false,
  onAcceptedChange,
  disabled = false,
  title = 'Terms & Conditions',
  description,
  className,
}) {
  const regionRef = useRef(null);
  const [atEnd, setAtEnd] = useState(false);

  const updateAtEnd = useCallback(() => {
    const node = regionRef.current;
    if (!node) return;
    setAtEnd(node.scrollHeight - node.scrollTop - node.clientHeight <= END_THRESHOLD_PX);
  }, []);

  useEffect(() => {
    updateAtEnd();
  }, [terms?.content, updateAtEnd]);

  const headerDescription =
    description ??
    (terms ? (
      <>
        Version {terms.version} · Published {formatDate(terms.publishedAt)}
      </>
    ) : (
      'Please read them before you continue.'
    ));

  let body;
  if (isLoading) {
    body = (
      <div role="status" className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <span className="sr-only">Loading the terms…</span>
        <SkeletonText lines={7} />
      </div>
    );
  } else if (error) {
    body = (
      <ErrorState compact error={error} title="We couldn't load the terms" onRetry={onRetry} />
    );
  } else if (terms) {
    body = (
      <div className="space-y-4">
        <div className="relative">
          <div
            ref={regionRef}
            role="region"
            aria-label={`Terms and Conditions, version ${terms.version}`}
            tabIndex={0}
            onScroll={updateAtEnd}
            className="scrollbar-thin max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:max-h-80 sm:px-5"
          >
            <TermsContent content={terms.content} idPrefix="enroll-terms" size="sm" />
          </div>
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-x-px bottom-px h-12 rounded-b-lg bg-gradient-to-t from-slate-50 to-transparent transition-opacity duration-150',
              atEnd ? 'opacity-0' : 'opacity-100',
            )}
          />
        </div>

        <div
          className={cn(
            'rounded-lg border p-4 transition-colors duration-150',
            accepted ? 'border-brand-200 bg-brand-50/60' : 'border-slate-200 bg-white',
          )}
        >
          <Checkbox
            checked={accepted}
            onChange={(event) => onAcceptedChange?.(event.target.checked)}
            disabled={disabled}
            label={`I have read and accept the Terms & Conditions (version ${terms.version})`}
            description="We save the version you accept and the time you accept it with your enrollment."
          />
        </div>
      </div>
    );
  } else {
    body = null;
  }

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={ScrollText}
        title={title}
        description={headerDescription}
        action={
          <a
            href={ROUTES.TERMS}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-flex min-h-[40px] items-center gap-1 rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            <span className="hidden sm:inline">Open full page</span>
            <span className="sm:hidden">Full page</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        }
      />
      <CardBody>{body}</CardBody>
    </Card>
  );
}

export default TermsBox;
