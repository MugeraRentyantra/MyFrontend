import { AlertCircle, AlertTriangle, CheckCircle2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatRange, MAX_SCORE, MIN_SCORE } from '../utils/validation';

/** Sequential brand tints: a bigger discount reads darker. Text never relies on colour alone. */
function slabTone(discount) {
  if (discount === null || discount === undefined || discount <= 0) return 'bg-slate-100 text-slate-700';
  if (discount <= 5) return 'bg-brand-100 text-brand-800';
  if (discount <= 10) return 'bg-brand-200 text-brand-900';
  if (discount <= 20) return 'bg-brand-400 text-white';
  return 'bg-brand-600 text-white';
}

const STATE_TONES = {
  gap: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300',
  overlap: 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300',
};

function countScores(ranges) {
  return ranges.reduce((total, [start, end]) => total + end - start + 1, 0);
}

function formatDiscount(discount) {
  return discount === null || discount === undefined ? '—' : `${discount}%`;
}

/** Merges consecutive scores that share a state (same slab, a gap, or an overlap) into segments. */
function buildSegments(analysis) {
  const segments = [];
  analysis.scores.forEach((entry) => {
    let state = 'slab';
    if (entry.slabIndexes.length === 0) state = 'gap';
    else if (entry.slabIndexes.length > 1) state = 'overlap';
    const slabIndex = state === 'slab' ? entry.slabIndexes[0] : null;
    const signature = state === 'slab' ? `slab-${slabIndex}` : state;
    const last = segments[segments.length - 1];
    if (last && last.signature === signature) {
      last.end = entry.score;
    } else {
      segments.push({ signature, state, slabIndex, start: entry.score, end: entry.score });
    }
  });
  return segments.map((segment) => {
    const discount = segment.state === 'slab' ? (analysis.rows[segment.slabIndex]?.discount ?? null) : null;
    let label = formatDiscount(discount);
    let description = `${formatScores(segment)}: ${formatDiscount(discount)} discount (slab ${segment.slabIndex + 1})`;
    if (segment.state === 'gap') {
      label = 'Gap';
      description = `${formatScores(segment)}: no slab`;
    } else if (segment.state === 'overlap') {
      label = 'Overlap';
      description = `${formatScores(segment)}: in more than one slab`;
    }
    return { ...segment, discount, label, description, span: segment.end - segment.start + 1 };
  });
}

function formatScores(segment) {
  return segment.start === segment.end
    ? `Score ${segment.start}`
    : `Scores ${segment.start} to ${segment.end}`;
}

/**
 * Visual 0-15 scale showing which discount each score earns (KD5). Gaps and overlaps are
 * highlighted and also spelled out in text below; screen readers get the same as a list.
 * `analysis` comes from analyseSlabs() / validateDraft().slabs.
 */
export function SlabCoverageBar({ analysis, className }) {
  const segments = buildSegments(analysis);
  const scoreCount = MAX_SCORE - MIN_SCORE + 1;
  const columns = { gridTemplateColumns: `repeat(${scoreCount}, minmax(0, 1fr))` };
  const hasGaps = analysis.gaps.length > 0;
  const hasOverlaps = analysis.overlaps.length > 0;

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Score coverage</h3>
        <p className="text-xs text-slate-500">
          Scores {MIN_SCORE}–{MAX_SCORE}
        </p>
      </div>

      <div className="mt-3" aria-hidden="true">
        <div className="grid gap-0.5" style={columns}>
          {segments.map((segment) => (
            <div
              key={`${segment.start}-${segment.signature}`}
              title={segment.description}
              style={{ gridColumn: `span ${segment.span} / span ${segment.span}` }}
              className={cn(
                'flex h-10 min-w-0 items-center justify-center overflow-hidden rounded-md px-0.5 text-xs font-semibold transition-colors duration-150',
                segment.state === 'slab' ? slabTone(segment.discount) : STATE_TONES[segment.state],
              )}
            >
              <span className={cn('truncate', segment.span < 2 && 'hidden sm:inline')}>{segment.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 grid" style={columns}>
          {analysis.scores.map((entry) => (
            <span key={entry.score} className="text-center text-[10px] tabular-nums leading-4 text-slate-500">
              {entry.score}
            </span>
          ))}
        </div>
      </div>

      <ul className="sr-only">
        {segments.map((segment) => (
          <li key={`${segment.start}-${segment.signature}`}>{segment.description}</li>
        ))}
      </ul>

      <div className="mt-3 space-y-1.5 text-xs">
        {!hasGaps && !hasOverlaps ? (
          <p className="flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Every score from {MIN_SCORE} to {MAX_SCORE} earns exactly one discount.
          </p>
        ) : null}
        {hasGaps ? (
          <p className="flex items-start gap-1.5 text-amber-800">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Gap:</span> no slab for{' '}
              {countScores(analysis.gaps) === 1 ? 'score' : 'scores'} {analysis.gaps.map(formatRange).join(', ')}.
            </span>
          </p>
        ) : null}
        {hasOverlaps ? (
          <p className="flex items-start gap-1.5 text-rose-700">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">Overlap:</span>{' '}
              {countScores(analysis.overlaps) === 1 ? 'score' : 'scores'}{' '}
              {analysis.overlaps.map(formatRange).join(', ')}{' '}
              {countScores(analysis.overlaps) === 1 ? 'is' : 'are'} in more than one slab.
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default SlabCoverageBar;
