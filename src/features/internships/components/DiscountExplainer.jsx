import { ASSESSMENT_MAX_SCORE, DEFAULT_DISCOUNT_SLABS, TEAM_MAX_MEMBERS } from '@/shared/constants';
import { CheckCircle2, Percent, ShieldCheck, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { MAX_EXAMPLE_DISCOUNT_PERCENT } from '../utils/catalogFormat';

const EXAMPLE_CAPTION = 'Example slabs — your exact discount is confirmed after the assessment.';

const SORTED_SLABS = [...DEFAULT_DISCOUNT_SLABS].sort((a, b) => b.minScore - a.minScore);

function formatScoreRange({ minScore, maxScore }) {
  return minScore === maxScore ? `${minScore}` : `${minScore}–${maxScore}`;
}

/** Illustrative slab table. The bars are decorative; the percentages are printed in text. */
function SlabTable({ className }) {
  const scale = MAX_EXAMPLE_DISCOUNT_PERCENT || 1;
  return (
    <table className={cn('w-full text-sm', className)}>
      <caption className="caption-bottom pt-3 text-left text-xs text-slate-500">
        {EXAMPLE_CAPTION}
      </caption>
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
          <th scope="col" className="py-2 pr-3 font-medium">
            Score (out of {ASSESSMENT_MAX_SCORE})
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            Individual discount
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {SORTED_SLABS.map((slab) => (
          <tr key={`${slab.minScore}-${slab.maxScore}`}>
            <th scope="row" className="tabular py-3 pr-3 text-left font-medium text-slate-900">
              {formatScoreRange(slab)}
            </th>
            <td className="py-3">
              <div className="flex items-center justify-end gap-3">
                <span
                  className="hidden h-2 w-24 overflow-hidden rounded-sm bg-slate-100 sm:block"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-r-sm bg-viz-1"
                    style={{ width: `${(Number(slab.discountPercent) / scale) * 100}%` }}
                  />
                </span>
                <span className="tabular w-12 text-right font-semibold text-slate-900">
                  {slab.discountPercent}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const POINTS = [
  {
    icon: CheckCircle2,
    title: 'No pass or fail',
    text: `Every score from 0 to ${ASSESSMENT_MAX_SCORE} can continue to enrollment.`,
  },
  {
    icon: Users,
    title: 'Individual enrollments only',
    text: `Teams of up to ${TEAM_MAX_MEMBERS} pay the full plan price — no discount applies.`,
  },
  {
    icon: ShieldCheck,
    title: 'Set by the server',
    text: 'Your score and discount are calculated by us and locked into your quote.',
  },
];

/**
 * Merit-discount explainer (SN5). `variant="section"` is the full-width home page band,
 * `variant="compact"` a card for side columns. Never mentions pass marks.
 */
export function DiscountExplainer({ variant = 'section', headingAs: Heading = 'h2', className }) {
  if (variant === 'compact') {
    return (
      <div
        className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
            aria-hidden="true"
          >
            <Percent className="h-4 w-4" />
          </span>
          <Heading className="text-base font-semibold text-slate-900">Merit discount</Heading>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Your assessment score decides your individual discount. Teams pay the full plan price.
        </p>
        <SlabTable className="mt-3" />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="merit-discount-heading"
      className={cn('bg-white py-16 sm:py-20', className)}
    >
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="eyebrow">Merit discount</p>
          <Heading
            id="merit-discount-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
          >
            Score higher, pay less
          </Heading>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            The assessment isn&apos;t a gate — it&apos;s your chance to earn a better price. Your
            score decides your individual discount
            {MAX_EXAMPLE_DISCOUNT_PERCENT > 0 ? `, up to ${MAX_EXAMPLE_DISCOUNT_PERCENT}% off` : ''}.
          </p>
          <ul className="mt-8 space-y-5">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <Percent className="h-4 w-4" />
            </span>
            <p className="text-base font-semibold text-slate-900">Example discount slabs</p>
          </div>
          <SlabTable className="mt-4" />
        </div>
      </div>
    </section>
  );
}

export default DiscountExplainer;
