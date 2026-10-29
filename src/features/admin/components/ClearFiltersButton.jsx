import { Button } from '@/shared/components/ui';
import { X } from '@/shared/icons';

/** Toolbar button shown only while at least one filter is active. */
export function ClearFiltersButton({ count = 0, onClear, className }) {
  if (!count) return null;
  return (
    <Button variant="ghost" leftIcon={X} onClick={onClear} className={className}>
      Clear filters
      <span className="sr-only"> ({count} active)</span>
    </Button>
  );
}

export default ClearFiltersButton;
