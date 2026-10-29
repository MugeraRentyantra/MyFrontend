import { cn } from '@/shared/utils/cn';

/**
 * Cancel / submit row for the catalog forms. With `inDialog` it sticks to the bottom of the
 * Modal's scrolling body and looks like the Modal footer, so the buttons stay reachable on small
 * screens (the negative margins match the Modal body padding, px-6 py-5).
 */
export function FormActions({ inDialog = false, className, children }) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end',
        inDialog
          ? 'sticky bottom-0 z-10 -mx-6 -mb-5 border-t border-slate-100 bg-slate-50 px-6 py-4'
          : 'border-t border-slate-100 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default FormActions;
