import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatCompactNumber, formatNumber } from '@/shared/utils/helpers';

// Mark colours (tailwind.config.js `viz` tokens). Text never uses these: labels stay in slate ink.
const SERIES_COLOR = '#2a78d6'; // viz-1, every bar of the single series
const SERIES_ACTIVE_COLOR = '#3987e5'; // one step lighter, for the hovered / focused bar
const GRID_COLOR = '#e1e0d9'; // viz-grid, hairline gridlines
const AXIS_COLOR = '#c3c2b7'; // viz-axis, the baseline
const MAX_TIP_LABELS = 8; // horizontal: value at every bar tip up to this many bars, else the max only
const ACTIVE_BAND = 'bg-slate-900/[0.04]';

// ---------------------------------------------------------------------------
// Scale helpers
// ---------------------------------------------------------------------------

/** Rounds a rough tick interval to 1, 2 or 5 × 10^n (integers only for count data). */
function niceStep(rough, integerOnly) {
  if (!Number.isFinite(rough) || rough <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(rough));
  const ratio = rough / power;
  let step = power;
  if (ratio >= Math.sqrt(50)) step = power * 10;
  else if (ratio >= Math.sqrt(10)) step = power * 5;
  else if (ratio >= Math.sqrt(2)) step = power * 2;
  return integerOnly ? Math.max(1, Math.round(step)) : step;
}

/** The next interval in the 1 → 2 → 5 → 10 sequence. */
function nextNiceStep(step) {
  const power = 10 ** Math.floor(Math.log10(step) + 1e-9);
  const ratio = Math.round(step / power);
  if (ratio < 2) return 2 * power;
  if (ratio < 5) return 5 * power;
  return 10 * power;
}

/** Clean ticks from a zero baseline, e.g. a max of 87 gives 0 · 20 · 40 · 60 · 80 · 100. */
function buildScale(maxValue, integerOnly) {
  if (!(maxValue > 0)) return { max: 1, ticks: [0] };
  let step = niceStep(maxValue / 4, integerOnly);
  let intervals = Math.max(1, Math.ceil(maxValue / step - 1e-9));
  if (intervals > 6) {
    step = nextNiceStep(step);
    intervals = Math.max(1, Math.ceil(maxValue / step - 1e-9));
  }
  const ticks = [];
  for (let index = 0; index <= intervals; index += 1) {
    ticks.push(Number((index * step).toPrecision(12)));
  }
  return { max: ticks[ticks.length - 1], ticks };
}

function normaliseData(data) {
  if (!Array.isArray(data)) return [];
  return data.filter(Boolean).map((datum, index) => {
    const numeric = Number(datum.value);
    const value = Number.isFinite(numeric) ? numeric : 0;
    return {
      key: index,
      label: datum.label === undefined || datum.label === null ? '' : String(datum.label),
      value,
      // Bars grow from one zero baseline; negative values are drawn as empty bars.
      magnitude: Math.max(0, value),
    };
  });
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

/** Value first (bold), label second. Decorative: the same text is the bar's aria-label. */
function ChartTooltip({ value, label, className, style }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute z-20 w-max max-w-[14rem] animate-fade-in rounded-lg bg-slate-900 px-2.5 py-1.5 text-left shadow-elevated',
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      <p className="tabular whitespace-nowrap text-sm font-semibold leading-5 text-white">{value}</p>
      {label ? <p className="break-words text-xs leading-4 text-slate-300">{label}</p> : null}
    </div>
  );
}

function verticalTooltipAlign(index, count) {
  if (count > 2) {
    const position = (index + 0.5) / count;
    if (position < 0.25) return 'left-0';
    if (position > 0.75) return 'right-0';
  }
  return 'left-1/2 -translate-x-1/2';
}

/**
 * X-axis category labels. Every `step`-th label is drawn, centred under its column in a slot `step`
 * columns wide (so thinned labels get the room of the hidden ones). Lives inside the chart height.
 */
function XAxisLabels({ items, step, className }) {
  const count = items.length;
  const slots = [];
  for (let index = 0; index < count; index += step) {
    const center = index + 0.5;
    // The first label may borrow the y-axis gutter; the last one never runs past the right edge.
    const half = index === 0 ? step / 2 : Math.min(step / 2, count - center);
    slots.push({ index, left: ((center - half) / count) * 100, width: ((2 * half) / count) * 100 });
  }
  return (
    <div className={cn('absolute inset-x-0 bottom-0 h-6', className)} aria-hidden="true">
      {slots.map((slot) => (
        <span
          key={slot.index}
          className="absolute top-1.5 truncate text-center text-xs leading-4 text-slate-500"
          style={{ left: `${slot.left}%`, width: `${slot.width}%` }}
        >
          {items[slot.index].label}
        </span>
      ))}
    </div>
  );
}

function VerticalBars({ items, height, formatValue, formatTick, activeIndex, getPointProps }) {
  const count = items.length;
  const dataMax = Math.max(0, ...items.map((item) => item.magnitude));
  const integerOnly = items.every((item) => Number.isInteger(item.value));
  const scale = buildScale(dataMax, integerOnly);
  const tickLabels = scale.ticks.map((tick) => String(formatTick(tick)));
  const axisChars = Math.max(1, ...tickLabels.map((label) => label.length));
  const maxIndex = dataMax > 0 ? items.findIndex((item) => item.magnitude === dataMax) : -1;
  // Thin the x labels: at most ~12 on wide screens and ~6 on phones.
  const desktopStep = Math.max(1, Math.ceil(count / 12));
  const mobileStep = desktopStep * Math.max(1, Math.ceil(Math.ceil(count / 6) / desktopStep));
  const toPercent = (value) => (scale.max > 0 ? (value / scale.max) * 100 : 0);

  return (
    <div className="flex w-full" style={{ height }}>
      {/* Y axis: plot box is inset 20px from the top (room for the max label) and 24px from the bottom (x labels). */}
      <div
        className="tabular relative shrink-0 text-xs text-slate-500"
        style={{ width: `calc(${axisChars}ch + 0.75rem)` }}
        aria-hidden="true"
      >
        <div className="absolute inset-x-0 bottom-6 top-5">
          {scale.ticks.map((tick, index) => (
            <span
              key={tick}
              className="absolute right-2 translate-y-1/2 whitespace-nowrap leading-none"
              style={{ bottom: `${toPercent(tick)}%` }}
            >
              {tickLabels[index]}
            </span>
          ))}
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 bottom-6 top-5">
          {scale.ticks.map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 h-px"
              style={{
                bottom: `${toPercent(tick)}%`,
                backgroundColor: tick === 0 ? AXIS_COLOR : GRID_COLOR,
              }}
              aria-hidden="true"
            />
          ))}

          <div className="absolute inset-0 flex">
            {items.map((item, index) => {
              const percent = toPercent(item.magnitude);
              const isActive = index === activeIndex;
              const formatted = formatValue(item.value);
              return (
                <div
                  key={item.key}
                  {...getPointProps(index, `${item.label}: ${formatted}`)}
                  className={cn(
                    'relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                    isActive && ACTIVE_BAND,
                  )}
                >
                  {/* Column: at most 24px wide, 4px rounded top (data end), square at the baseline. */}
                  <div
                    className="w-[62%] min-w-[2px] max-w-[24px] rounded-t transition-colors duration-150"
                    style={{
                      height: `${percent}%`,
                      backgroundColor: isActive ? SERIES_ACTIVE_COLOR : SERIES_COLOR,
                    }}
                  />
                  {index === maxIndex && !isActive ? (
                    <span
                      className={cn(
                        'tabular pointer-events-none absolute whitespace-nowrap text-xs font-medium leading-4 text-slate-700',
                        count > 1 && index === count - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2',
                      )}
                      style={{ bottom: `calc(${percent}% + 4px)` }}
                      aria-hidden="true"
                    >
                      {formatted}
                    </span>
                  ) : null}
                  {isActive ? (
                    <ChartTooltip
                      value={formatted}
                      label={item.label}
                      className={verticalTooltipAlign(index, count)}
                      style={
                        percent > 60
                          ? { top: `calc(${100 - percent}% + 8px)` }
                          : { bottom: `calc(${percent}% + 8px)` }
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {mobileStep === desktopStep ? (
          <XAxisLabels items={items} step={desktopStep} />
        ) : (
          <>
            <XAxisLabels items={items} step={mobileStep} className="sm:hidden" />
            <XAxisLabels items={items} step={desktopStep} className="hidden sm:block" />
          </>
        )}
      </div>
    </div>
  );
}

const ROW_GRID =
  'grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]';

function HorizontalBars({ items, formatValue, formatTick, activeIndex, getPointProps }) {
  const count = items.length;
  const labelEveryBar = count <= MAX_TIP_LABELS;
  const dataMax = Math.max(0, ...items.map((item) => item.magnitude));
  const integerOnly = items.every((item) => Number.isInteger(item.value));
  // With every bar labelled no value axis is needed, so bars scale to the data max.
  const scale = labelEveryBar
    ? { max: dataMax > 0 ? dataMax : 1, ticks: [0] }
    : buildScale(dataMax, integerOnly);
  const maxIndex = dataMax > 0 ? items.findIndex((item) => item.magnitude === dataMax) : -1;
  const formattedValues = items.map((item) => String(formatValue(item.value)));
  const tickLabels = scale.ticks.map((tick) => String(formatTick(tick)));
  const valueChars = Math.max(1, ...formattedValues.map((text) => text.length));
  // Space kept free at the end of every track so a tip label always fits beside the longest bar.
  const reserve = `(${valueChars + 1}ch + 0.5rem)`;
  const at = (fraction) => `calc((100% - ${reserve}) * ${fraction})`;

  return (
    <div>
      {items.map((item, index) => {
        const fraction = Math.min(1, item.magnitude / scale.max);
        const isActive = index === activeIndex;
        const showTip = labelEveryBar || index === maxIndex;
        const tooltipStyle = index === 0 ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' };
        if (fraction > 0.6) tooltipStyle.right = `calc(100% - ${at(fraction)})`;
        else tooltipStyle.left = at(fraction);

        return (
          <div
            key={item.key}
            {...getPointProps(index, `${item.label}: ${formattedValues[index]}`)}
            className={cn(
              ROW_GRID,
              'cursor-default rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive && ACTIVE_BAND,
            )}
          >
            <span className="truncate pl-1 text-sm text-slate-600">{item.label}</span>
            <div className="relative flex h-8 items-center text-xs">
              {scale.ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute inset-y-0 w-px"
                  style={{
                    left: at(tick / scale.max),
                    backgroundColor: tick === 0 ? AXIS_COLOR : GRID_COLOR,
                  }}
                  aria-hidden="true"
                />
              ))}
              {/* Bar: 16px thick, 4px rounded data end, square at the baseline. */}
              <div
                className="relative h-4 shrink-0 rounded-r transition-colors duration-150"
                style={{
                  width: at(fraction),
                  backgroundColor: isActive ? SERIES_ACTIVE_COLOR : SERIES_COLOR,
                }}
              />
              {showTip ? (
                <span className="tabular relative ml-2 shrink-0 whitespace-nowrap font-medium text-slate-700">
                  {formattedValues[index]}
                </span>
              ) : null}
              {isActive ? (
                <ChartTooltip value={formattedValues[index]} label={item.label} style={tooltipStyle} />
              ) : null}
            </div>
          </div>
        );
      })}

      {!labelEveryBar ? (
        <div className={ROW_GRID} aria-hidden="true">
          <span />
          <div className="tabular relative h-6 text-xs text-slate-500">
            {scale.ticks.map((tick, index) => (
              <span
                key={tick}
                className="absolute top-1.5 -translate-x-1/2 whitespace-nowrap leading-4"
                style={{ left: at(tick / scale.max) }}
              >
                {tickLabels[index]}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChartDataTable({ id, items, formatValue, caption, labelHeader, valueHeader }) {
  return (
    <div id={id} className="scrollbar-thin mt-2 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              {labelHeader}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              {valueHeader}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.key}>
              <th scope="row" className="px-3 py-2 text-left font-normal text-slate-700">
                {item.label}
              </th>
              <td className="tabular px-3 py-2 text-right font-medium text-slate-900">
                {formatValue(item.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------

/**
 * Single-series bar / column chart (SPEC §10), hand-built with CSS so it is responsive without measuring.
 * data = [{ label, value }]. vertical = columns (trends over time), horizontal = one row per category
 * (pass the rows already sorted by value). `title` is the accessible name (the card heading names the
 * series visually); `description` is read by screen readers. Every bar is focusable with a tooltip on hover
 * and focus, and a "View as table" toggle shows the same values as a table.
 * `tickFormatter` (optional) formats axis ticks; it defaults to `valueFormatter` when one is given (so units
 * match), else compact numbers (1K / 1L).
 */
export function BarChart({
  data = [],
  orientation = 'vertical',
  valueFormatter,
  tickFormatter,
  height = 240,
  title,
  description,
  labelHeader = 'Label',
  valueHeader = 'Value',
  emptyMessage = 'No data yet',
  className,
  ...rest
}) {
  const baseId = useId();
  const descriptionId = `${baseId}-description`;
  const tableId = `${baseId}-table`;
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const pointRefs = useRef([]);
  const items = useMemo(() => normaliseData(data), [data]);

  const isHorizontal = orientation === 'horizontal';
  const formatValue = (value) => (valueFormatter ?? formatNumber)(value);
  const formatTick = tickFormatter ?? valueFormatter ?? formatCompactNumber;
  const activeIndex = hoveredIndex ?? focusedIndex;

  if (!items.length) {
    return (
      <figure className={cn('min-w-0', className)} aria-label={title || undefined} {...rest}>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 px-4 text-center text-sm text-slate-500"
          style={isHorizontal ? { minHeight: '8rem' } : { height }}
        >
          {emptyMessage}
        </div>
      </figure>
    );
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Escape') {
      setHoveredIndex(null);
      setFocusedIndex(null);
      return;
    }
    const nextKey = isHorizontal ? 'ArrowDown' : 'ArrowRight';
    const previousKey = isHorizontal ? 'ArrowUp' : 'ArrowLeft';
    let next = null;
    if (event.key === nextKey) next = Math.min(items.length - 1, index + 1);
    else if (event.key === previousKey) next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    pointRefs.current[next]?.focus();
  };

  // Each bar's hit target (its whole column / row) is focusable and announced as "Label: value".
  const getPointProps = (index, label) => ({
    ref: (node) => {
      pointRefs.current[index] = node;
    },
    role: 'img',
    tabIndex: 0,
    'aria-label': label,
    onMouseEnter: () => setHoveredIndex(index),
    onMouseLeave: () => setHoveredIndex((current) => (current === index ? null : current)),
    onFocus: () => setFocusedIndex(index),
    onBlur: () => setFocusedIndex((current) => (current === index ? null : current)),
    onKeyDown: (event) => handleKeyDown(event, index),
  });

  const chartProps = { items, formatValue, formatTick, activeIndex, getPointProps };
  const barCount = `${items.length} ${items.length === 1 ? 'bar' : 'bars'}`;

  return (
    <figure
      className={cn('min-w-0', className)}
      aria-label={title || 'Bar chart'}
      aria-describedby={description ? descriptionId : undefined}
      {...rest}
    >
      {description ? (
        <p id={descriptionId} className="sr-only">
          {description}
        </p>
      ) : null}

      <div role="group" aria-label={`Bar chart, ${barCount}`}>
        {isHorizontal ? (
          <HorizontalBars {...chartProps} />
        ) : (
          <VerticalBars {...chartProps} height={height} />
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((open) => !open)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {showTable ? 'Hide table' : 'View as table'}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform duration-150', showTable && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      </div>

      {showTable ? (
        <ChartDataTable
          id={tableId}
          items={items}
          formatValue={formatValue}
          caption={title ? `${title} (data table)` : 'Chart data'}
          labelHeader={labelHeader}
          valueHeader={valueHeader}
        />
      ) : null}
    </figure>
  );
}

export default BarChart;
