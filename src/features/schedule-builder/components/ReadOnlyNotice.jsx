import { Button, StatusBanner } from '@/shared/components/ui';
import { SCHEDULE_STATUS } from '@/shared/constants';
import { Archive, Copy, Lock } from '@/shared/icons';

/**
 * Shown on published / archived versions: they are immutable, so changes start from a new draft.
 */
export function ReadOnlyNotice({ status, version, onCreateDraft, isCreating = false, className }) {
  const archived = status === SCHEDULE_STATUS.ARCHIVED;
  const label = version ? `Version ${version}` : 'This version';

  return (
    <StatusBanner
      variant="info"
      icon={archived ? Archive : Lock}
      title={archived ? `${label} is archived` : `${label} is published`}
      action={
        onCreateDraft ? (
          <Button
            variant="outline"
            size="sm"
            leftIcon={Copy}
            loading={isCreating}
            onClick={onCreateDraft}
          >
            Create new draft
          </Button>
        ) : null
      }
      className={className}
    >
      {archived
        ? "Archived versions can't be edited or published again. Create a new draft to make changes."
        : "Published versions can't be edited. Create a new draft to make changes."}
    </StatusBanner>
  );
}

export default ReadOnlyNotice;
