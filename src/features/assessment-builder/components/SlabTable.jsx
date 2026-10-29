import { useRef } from 'react';
import { Button, Input, StatusBanner } from '@/shared/components/ui';
import { Info, Plus, RotateCcw, Trash2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import {
  createDefaultSlabRows,
  createSlabRow,
  formatRange,
  MAX_SCORE,
  MAX_SLABS,
  MIN_SCORE,
} from '../utils/validation';
import { SlabCoverageBar } from './SlabCoverageBar';

export const TEAM_PRICING_NOTE =
  'Slabs apply to individual enrollments only — team members always pay the full plan price.';
export const NO_PASS_MARK_NOTE =
  'There is no pass mark: every score from 0 to 15 can continue to enrollment.';

function previewText(row) {
  if (!row || !row.rangeValid) return '—';
  const scores = row.min === row.max ? `Score ${row.min}` : `Scores ${formatRange([row.min, row.max])}`;
  if (row.discount === null || row.errors.discountPercent) return scores;
  return row.discount > 0 ? `${scores}: ${row.discount}% off` : `${scores}: full price`;
}

/**
 * Discount slab editor (KD5): min score, max score and discount % per row, "Reset to defaults",
 * a live 0-15 coverage bar and the pricing notes. Values stay strings while typing; validation
 * (`analysis`, from analyseSlabs) drives the inline errors.
 */
export function SlabTable({ slabs, onChange, analysis, disabled = false }) {
  const addButtonRef = useRef(null);
  const canAdd = !disabled && slabs.length < MAX_SLABS;

  const updateRow = (index, field, value) => {
    onChange(slabs.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)));
  };
  const removeRow = (index) => {
    // The clicked button disappears with its row: keep keyboard focus inside the editor.
    addButtonRef.current?.focus();
    onChange(slabs.filter((_, rowIndex) => rowIndex !== index));
  };
  const addRow = () => {
    if (canAdd) onChange([...slabs, createSlabRow()]);
  };
  const resetRows = () => onChange(createDefaultSlabRows());

  const numberInputProps = {
    type: 'number',
    inputMode: 'numeric',
    step: 1,
    disabled,
    inputClassName: 'tabular-nums',
  };

  return (
    <section id="slabs" aria-labelledby="slabs-heading" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="slabs-heading" tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-none">
            Discount slabs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Each score range earns a discount on the plan&apos;s base price. Scores run from {MIN_SCORE} to{' '}
            {MAX_SCORE}; every score needs exactly one slab.
          </p>
        </div>
        {!disabled ? (
          <Button variant="outline" size="sm" leftIcon={RotateCcw} onClick={resetRows} className="h-10 shrink-0 sm:h-8">
            Reset to defaults
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        {slabs.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">No slabs yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a slab or reset to the default slabs to give every score a discount.
            </p>
          </div>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="min-w-full text-sm">
              <caption className="sr-only">Discount slabs: score range and discount for each slab</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="hidden w-12 px-4 py-3 text-left sm:table-cell">
                    <span className="sr-only">Slab</span>
                    <span aria-hidden="true">#</span>
                  </th>
                  <th scope="col" className="py-3 pl-4 pr-2 text-left sm:pl-2">
                    Min score
                  </th>
                  <th scope="col" className="px-2 py-3 text-left">
                    Max score
                  </th>
                  <th scope="col" className="px-2 py-3 text-left">
                    Discount
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-left md:table-cell">
                    Students get
                  </th>
                  <th scope="col" className="py-3 pl-2 pr-4 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {slabs.map((row, index) => {
                  const number = index + 1;
                  const status = analysis.rows[index];
                  const errors = status?.errors ?? {};
                  return (
                    <tr key={row.key} className="align-top">
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className="flex h-10 items-center font-medium tabular-nums text-slate-500">{number}</span>
                      </td>
                      <td className="py-3 pl-4 pr-2 sm:pl-2">
                        <Input
                          {...numberInputProps}
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          aria-label={`Slab ${number} minimum score`}
                          value={row.minScore}
                          onChange={(event) => updateRow(index, 'minScore', event.target.value)}
                          error={errors.minScore}
                          className="w-20 sm:w-24"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <Input
                          {...numberInputProps}
                          min={MIN_SCORE}
                          max={MAX_SCORE}
                          aria-label={`Slab ${number} maximum score`}
                          value={row.maxScore}
                          onChange={(event) => updateRow(index, 'maxScore', event.target.value)}
                          error={errors.maxScore}
                          className="w-20 sm:w-24"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <Input
                          {...numberInputProps}
                          inputMode="decimal"
                          step="any"
                          min={0}
                          max={100}
                          aria-label={`Slab ${number} discount percent`}
                          value={row.discountPercent}
                          onChange={(event) => updateRow(index, 'discountPercent', event.target.value)}
                          error={errors.discountPercent}
                          rightElement="%"
                          className="w-24 sm:w-28"
                        />
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span
                          className={cn(
                            'flex h-10 items-center whitespace-nowrap',
                            status?.rangeValid ? 'text-slate-700' : 'text-slate-400',
                          )}
                        >
                          {previewText(status)}
                        </span>
                      </td>
                      <td className="py-3 pl-2 pr-4 text-right">
                        {!disabled ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove slab ${number}`}
                            onClick={() => removeRow(index)}
                            className="hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-500"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!disabled ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <Button
              ref={addButtonRef}
              variant="outline"
              size="sm"
              leftIcon={Plus}
              onClick={addRow}
              disabled={!canAdd}
              className="h-10 sm:h-8"
            >
              Add slab
            </Button>
            <p className="text-xs text-slate-500">
              <span className="tabular-nums">{slabs.length}</span> {slabs.length === 1 ? 'slab' : 'slabs'}
            </p>
          </div>
        ) : null}
      </div>

      <SlabCoverageBar analysis={analysis} />

      <StatusBanner variant="info" icon={Info} title="How discounts work">
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>{TEAM_PRICING_NOTE}</li>
          <li>{NO_PASS_MARK_NOTE}</li>
        </ul>
      </StatusBanner>
    </section>
  );
}

export default SlabTable;
