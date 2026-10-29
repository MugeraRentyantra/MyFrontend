import { cn } from '@/shared/utils/cn';

function isEmptyValue(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Label/value pairs: items = [{ label, value (node), span: 1|2 }], columns 1|2 (two columns from sm).
 * Falsy items are skipped, so conditional rows can be written inline (`cond && { … }`).
 */
export function DescriptionList({ items = [], columns = 2, className, ...rest }) {
  const twoColumns = Number(columns) === 2;

  return (
    <dl
      className={cn('grid grid-cols-1 gap-x-6 gap-y-4', twoColumns && 'sm:grid-cols-2', className)}
      {...rest}
    >
      {items.filter(Boolean).map((item, index) => (
        <div
          key={item.key ?? index}
          className={cn('min-w-0', twoColumns && Number(item.span) === 2 && 'sm:col-span-2')}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">
            {isEmptyValue(item.value) ? <span className="text-slate-500">—</span> : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default DescriptionList;
