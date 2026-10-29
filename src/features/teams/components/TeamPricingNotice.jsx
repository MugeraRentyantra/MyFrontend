import { Info } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/** The two team pricing rules (SN10), shown wherever someone commits to a team. */
export function TeamPricingNotice({ className }) {
  return (
    <div
      className={cn('flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm', className)}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium text-sky-900">How team pricing works</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sky-800">
          <li>
            Team enrollments are charged at the full plan price — the assessment discount applies to
            individual enrollments only.
          </li>
          <li>Every member takes the assessment and pays for their own seat.</li>
        </ul>
      </div>
    </div>
  );
}

export default TeamPricingNotice;
