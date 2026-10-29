import { Button } from '@/shared/components/ui';
import { EyeOff, Globe, Pencil } from '@/shared/icons';
import { PUBLISH_STATUS } from '@/shared/constants';

/**
 * Row actions shared by the catalog tables: Edit + Publish / Unpublish. There is deliberately no
 * delete (the catalog is never hard-deleted; unpublishing hides an item instead).
 * `itemLabel` names the row for screen readers ("Edit Java Developer").
 */
export function CatalogRowActions({ itemLabel, status, onEdit, onChangeStatus, editLabel = 'Edit' }) {
  const isPublished = status === PUBLISH_STATUS.PUBLISHED;
  // 40px touch targets on phones, a calmer 32px from `sm` up.
  const sizeClasses = 'h-10 sm:h-8';

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={Pencil}
        className={sizeClasses}
        onClick={onEdit}
        aria-label={`${editLabel} ${itemLabel}`}
      >
        {editLabel}
      </Button>
      {isPublished ? (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={EyeOff}
          className={sizeClasses}
          onClick={() => onChangeStatus(PUBLISH_STATUS.DRAFT)}
          aria-label={`Unpublish ${itemLabel}`}
        >
          Unpublish
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          leftIcon={Globe}
          className={sizeClasses}
          onClick={() => onChangeStatus(PUBLISH_STATUS.PUBLISHED)}
          aria-label={`Publish ${itemLabel}`}
        >
          Publish
        </Button>
      )}
    </div>
  );
}

export default CatalogRowActions;
