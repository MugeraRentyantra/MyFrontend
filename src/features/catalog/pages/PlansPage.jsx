import { useCallback, useState } from 'react';
import { Button, PageHeader, toast } from '@/shared/components/ui';
import { Plus } from '@/shared/icons';
import { PUBLISH_STATUS } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils/errors';
import { PlanDialog } from '../components/PlanDialog';
import { describePlan, PlansTable } from '../components/PlansTable';
import { StatusChangeDialog } from '../components/StatusChangeDialog';
import { useSetPlanStatus } from '../hooks/useEmployerInternships';

/**
 * /admin/plans (KD4) — internship plans and base prices. Create and edit go through
 * PostInternshipForm in a modal; publishing and unpublishing ask for confirmation first.
 */
export default function PlansPage() {
  useDocumentTitle('Plans & pricing');
  const statusMutation = useSetPlanStatus();

  // Targets are kept after closing so dialog titles don't change while they animate out.
  const [editor, setEditor] = useState({ open: false, plan: null });
  const [statusChange, setStatusChange] = useState({ open: false, plan: null, status: null });

  const openCreate = useCallback(() => setEditor({ open: true, plan: null }), []);
  const openEdit = useCallback((plan) => setEditor({ open: true, plan }), []);
  const closeEditor = useCallback(() => setEditor((current) => ({ ...current, open: false })), []);
  const requestStatusChange = useCallback(
    (plan, status) => setStatusChange({ open: true, plan, status }),
    [],
  );

  const closeStatusChange = () => {
    if (statusMutation.isPending) return;
    setStatusChange((current) => ({ ...current, open: false }));
  };

  const confirmStatusChange = () => {
    const { plan, status } = statusChange;
    if (!plan || statusMutation.isPending) return;
    const isPublish = status === PUBLISH_STATUS.PUBLISHED;
    statusMutation.mutate(
      { id: plan._id, status },
      {
        onSuccess: () => {
          setStatusChange((current) => ({ ...current, open: false }));
          toast.success(isPublish ? 'Plan published' : 'Plan unpublished', {
            description: isPublish
              ? `${describePlan(plan)} is now offered to students.`
              : `${describePlan(plan)} is hidden from new students. Existing enrollments are not affected.`,
          });
        },
        onError: (error) => {
          toast.error(`Couldn't ${isPublish ? 'publish' : 'unpublish'} the plan`, {
            description: getErrorMessage(error),
          });
        },
      },
    );
  };

  const statusPlan = statusChange.plan;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Plans & pricing"
        description="Each plan is a designation, a domain and a duration with a base price. Assessment discounts are applied by the server when a student gets a quote; price changes only affect new quotes."
        actions={
          <Button leftIcon={Plus} onClick={openCreate}>
            Create plan
          </Button>
        }
      />

      <PlansTable onCreate={openCreate} onEdit={openEdit} onChangeStatus={requestStatusChange} />

      <PlanDialog open={editor.open} onClose={closeEditor} plan={editor.plan} />

      <StatusChangeDialog
        open={statusChange.open}
        onClose={closeStatusChange}
        onConfirm={confirmStatusChange}
        loading={statusMutation.isPending}
        nextStatus={statusChange.status}
        itemName={statusPlan ? describePlan(statusPlan) : undefined}
        entityLabel="plan"
        publishMessage="Students will be able to choose this plan and get a quote for it."
      />
    </div>
  );
}
