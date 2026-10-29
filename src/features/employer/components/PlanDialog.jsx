import { Modal } from '@/shared/components/ui';
import { formatDuration } from '@/shared/utils/helpers';
import { PostInternshipForm } from './PostInternshipForm';

function planTitle(plan) {
  return [plan.designation?.name, plan.domain?.name, formatDuration(plan.durationMonths)]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Modal wrapper around PostInternshipForm (KD4). `plan` = null creates a plan, otherwise edits it.
 * The form is mounted fresh each time the dialog opens, so it always starts from the saved values.
 */
export function PlanDialog({ open, onClose, plan = null }) {
  const isEdit = Boolean(plan);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit plan' : 'Create plan'}
      description={
        isEdit
          ? planTitle(plan)
          : 'Pick a designation, a domain and a duration, then set the base price.'
      }
    >
      {open ? (
        <PostInternshipForm
          key={plan?._id ?? 'new'}
          plan={plan}
          onCancel={onClose}
          onSaved={onClose}
          inDialog
        />
      ) : null}
    </Modal>
  );
}

export default PlanDialog;
