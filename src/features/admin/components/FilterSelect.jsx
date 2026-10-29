import { Select } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/**
 * Compact filter for DataTable toolbars: a native Select whose first option clears the filter.
 * `label` is the accessible name (the toolbar has no visible labels; the "All …" option names the
 * filter visually). `onChange(value)` receives '' for "All".
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  allLabel = 'All',
  className,
  disabled,
  ...rest
}) {
  const current = value ?? '';
  return (
    <Select
      aria-label={label}
      value={current}
      onChange={(event) => onChange(event.target.value)}
      options={[{ value: '', label: allLabel }, ...options]}
      disabled={disabled}
      className={cn('w-full sm:w-44', className)}
      selectClassName={current ? 'border-brand-300 bg-brand-50/60 text-brand-800' : undefined}
      {...rest}
    />
  );
}

export default FilterSelect;
