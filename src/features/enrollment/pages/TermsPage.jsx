import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonText,
} from '@/shared/components/ui';
import { ROUTES, SUPPORT_EMAIL } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { Mail, ScrollText } from '@/shared/icons';
import { getErrorStatus } from '@/shared/utils/errors';
import { formatDate } from '@/shared/utils/helpers';
import { TermsContent } from '../components/TermsContent';
import { TermsToc } from '../components/TermsToc';
import { useTerms } from '../hooks/useTerms';
import { TERMS_PAGE_ID_PREFIX, extractTermsHeadings } from '../utils/terms';

function TermsSkeleton() {
  return (
    <div role="status" className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <span className="sr-only">Loading the terms…</span>
      <div className="hidden space-y-3 lg:block" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
      <div className="max-w-3xl space-y-8" aria-hidden="true">
        <SkeletonText lines={3} />
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <SkeletonText lines={4} />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-64" />
          <SkeletonText lines={5} />
        </div>
      </div>
    </div>
  );
}

/** Public Terms & Conditions page (/terms): the latest published version (SD5). */
export function TermsPage() {
  useDocumentTitle('Terms & Conditions');
  const { data: terms, isLoading, isError, error, refetch } = useTerms();
  const headings = useMemo(
    () => extractTermsHeadings(terms?.content, TERMS_PAGE_ID_PREFIX),
    [terms?.content],
  );

  let description = 'The rules that apply to every internship you enrol in through the portal.';
  if (terms) {
    description = (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant="brand" size="md">
          Version {terms.version}
        </Badge>
        <span>
          Published <time dateTime={terms.publishedAt}>{formatDate(terms.publishedAt)}</time>
        </span>
      </span>
    );
  }

  let content;
  if (isLoading) {
    content = <TermsSkeleton />;
  } else if (isError && getErrorStatus(error) === 404) {
    content = (
      <EmptyState
        icon={ScrollText}
        title="The terms aren't published yet"
        description="Please check back soon. If you have a question in the meantime, our support team can help."
        action={
          <Button as="a" href={`mailto:${SUPPORT_EMAIL}`} variant="outline" leftIcon={Mail}>
            Email support
          </Button>
        }
      />
    );
  } else if (isError) {
    content = (
      <ErrorState error={error} title="We couldn't load the terms" onRetry={() => refetch()} />
    );
  } else if (terms) {
    content = (
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <TermsToc headings={headings} />
        <article className="min-w-0 max-w-3xl">
          <TermsContent content={terms.content} idPrefix={TERMS_PAGE_ID_PREFIX} />
          <footer className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Questions about these terms?</p>
            <p className="mt-1">
              Email{' '}
              <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{' '}
              from your registered address. The version you accepted when you enrolled stays on
              record with your enrollment.
            </p>
            <p className="mt-3">
              <Link className="link" to={ROUTES.CATALOG}>
                Browse internships
              </Link>
            </p>
          </footer>
        </article>
      </div>
    );
  } else {
    content = null;
  }

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50/80">
        <div className="container-page py-10 sm:py-12">
          <PageHeader eyebrow="Legal" title="Terms & Conditions" description={description} />
        </div>
      </div>
      <div className="container-page py-10 sm:py-12">{content}</div>
    </div>
  );
}

export default TermsPage;
