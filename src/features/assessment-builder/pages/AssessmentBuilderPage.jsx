import { Link, useParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonCard,
} from '@/shared/components/ui';
import { ArrowLeft, ClipboardCheck } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { AssessmentBuilder } from '../components/AssessmentBuilder';
import { useAssessmentConfig, useAssessmentConfigs } from '../hooks/useAssessmentBuilder';

const BACK_TO_LIST = { label: 'All assessments', to: ROUTES.ADMIN_ASSESSMENTS };

function BuilderSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the assessment…
      </span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

function PageShell({ children }) {
  return (
    <div className="space-y-6">
      <PageHeader backTo={BACK_TO_LIST} eyebrow="Assessment builder" title="Assessment" />
      {children}
    </div>
  );
}

/**
 * /admin/assessments/:designationId (KD5). Loads the latest config (null = none yet, so the
 * builder starts an empty draft with the default slabs) and the designation it belongs to.
 */
export default function AssessmentBuilderPage() {
  const { designationId } = useParams();
  const configQuery = useAssessmentConfig(designationId);
  const summariesQuery = useAssessmentConfigs();

  const summary = summariesQuery.data?.find((item) => item.designationId === designationId) ?? null;
  const designation = configQuery.data?.designation ?? summary?.designation ?? null;
  useDocumentTitle(designation?.name ? `${designation.name} assessment` : 'Assessment builder');

  if (configQuery.isPending) return <BuilderSkeleton />;

  if (configQuery.isError) {
    return (
      <PageShell>
        <ErrorState
          title="Couldn't load this assessment"
          error={configQuery.error}
          onRetry={() => configQuery.refetch()}
        />
      </PageShell>
    );
  }

  // No config yet: confirm the designation exists before offering an empty draft.
  if (configQuery.data === null) {
    if (summariesQuery.isPending) return <BuilderSkeleton />;
    if (summariesQuery.isError) {
      return (
        <PageShell>
          <ErrorState
            title="Couldn't load this designation"
            error={summariesQuery.error}
            onRetry={() => summariesQuery.refetch()}
          />
        </PageShell>
      );
    }
    if (!summary) {
      return (
        <PageShell>
          <EmptyState
            icon={ClipboardCheck}
            title="Designation not found"
            description="It may have been removed or the link is incomplete. Pick a designation from the list instead."
            action={
              <Button as={Link} to={ROUTES.ADMIN_ASSESSMENTS} leftIcon={ArrowLeft}>
                Back to assessments
              </Button>
            }
          />
        </PageShell>
      );
    }
  }

  return (
    <AssessmentBuilder
      key={designationId}
      designationId={designationId}
      designation={designation}
      config={configQuery.data}
    />
  );
}
