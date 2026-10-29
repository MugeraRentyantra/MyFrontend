import { ShieldCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/** Honest note above protected SOP content: what is done to protect it and what can't be. */
export function ProtectedContentNotice({ className }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900',
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
      <p>
        <span className="font-semibold">Protected content:</span> view-only and watermarked with your
        name and ID. Copying and screenshots can&apos;t be fully prevented — please don&apos;t share
        it.
      </p>
    </div>
  );
}

export default ProtectedContentNotice;
