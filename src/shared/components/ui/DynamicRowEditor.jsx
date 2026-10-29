import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { Button } from './Button';

const EMPTY_ROWS = [];

/** Focus is only restored when the parent applies our change promptly (normally the same tick). */
const FOCUS_WINDOW_MS = 1500;

/** 40px touch targets on mobile, a calmer 32px from `sm` up. */
const ROW_ICON_BUTTON_CLASSES = 'sm:h-8 sm:w-8';

const FIRST_FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
].join(', ');

function defaultGetRowKey(row, index) {
  if (row !== null && typeof row === 'object') {
    return row._id ?? row.key ?? index;
  }
  return index;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * DynamicRowEditor (KD2) — a pure controlled list editor used by the question, discount-slab and
 * schedule-day editors.
 *
 * `rows`, `onChange(nextRows)` (always a new array), `renderRow(row, index, helpers)` where helpers =
 * { update(patch | fn), remove(), moveUp(), moveDown(), isFirst, isLast, index, count, canRemove,
 * disabled, id }. `createRow(index, rows)` is the factory for "Add" (no Add button without it).
 * `addLabel` ["Add row"], `itemLabel` ["Row"] (used in "Question 3" and aria-labels such as
 * "Move Question 3 up"), `minRows` [0], `maxRows`, `reorderable` [true], `disabled` (read-only:
 * no add/remove/reorder controls), `getRowKey(row, index)` [row._id ?? row.key ?? index],
 * `emptyState` (node), `className`.
 */
export function DynamicRowEditor({
  rows,
  onChange,
  renderRow,
  createRow,
  addLabel = 'Add row',
  itemLabel = 'Row',
  minRows = 0,
  maxRows,
  reorderable = true,
  disabled = false,
  getRowKey = defaultGetRowKey,
  emptyState,
  className,
  ...rest
}) {
  const list = Array.isArray(rows) ? rows : EMPTY_ROWS;
  const count = list.length;
  const editorId = useId();

  // Latest rows including changes emitted in this tick, so two helper calls in one handler compose.
  const latestRowsRef = useRef(list);
  const controlsRef = useRef(new Map());
  const bodiesRef = useRef(new Map());
  const addButtonRef = useRef(null);
  const pendingFocusRef = useRef(null);

  useLayoutEffect(() => {
    latestRowsRef.current = list;
  }, [list]);

  const hasMax = typeof maxRows === 'number' && Number.isFinite(maxRows);
  const canCreate = typeof createRow === 'function';
  const canAdd = !disabled && canCreate && (!hasMax || count < maxRows);
  const canRemove = !disabled && count > minRows;
  const showReorder = reorderable && !disabled;

  const commit = (next, focusRequest) => {
    latestRowsRef.current = next;
    if (focusRequest) {
      pendingFocusRef.current = { ...focusRequest, expectedLength: next.length, at: Date.now() };
    }
    if (onChange) onChange(next);
  };

  const updateRow = (index, patch) => {
    const current = latestRowsRef.current;
    if (index < 0 || index >= current.length) return;
    const row = current[index];
    const changes = typeof patch === 'function' ? patch(row) : patch;
    const nextRow = isPlainObject(row) && isPlainObject(changes) ? { ...row, ...changes } : changes;
    const next = current.slice();
    next[index] = nextRow;
    commit(next, null);
  };

  const removeRow = (index) => {
    const current = latestRowsRef.current;
    if (disabled || current.length <= minRows || index < 0 || index >= current.length) return;
    const next = current.filter((_, rowIndex) => rowIndex !== index);
    commit(next, { type: 'remove', index });
  };

  const moveRow = (index, delta) => {
    const current = latestRowsRef.current;
    const target = index + delta;
    if (disabled || index < 0 || index >= current.length) return;
    if (target < 0 || target >= current.length) return;
    const next = current.slice();
    const moved = next[index];
    next[index] = next[target];
    next[target] = moved;
    commit(next, { type: 'move', index: target, direction: delta < 0 ? 'up' : 'down' });
  };

  const addRow = () => {
    const current = latestRowsRef.current;
    if (disabled || !canCreate) return;
    if (hasMax && current.length >= maxRows) return;
    const newRow = createRow(current.length, current);
    commit([...current, newRow], { type: 'add', index: current.length });
  };

  // Keep keyboard focus sensible after add / remove / move (the clicked control may have moved,
  // been disabled or been removed).
  useEffect(() => {
    const request = pendingFocusRef.current;
    if (!request) return;
    pendingFocusRef.current = null;
    if (list.length !== request.expectedLength) return;
    if (Date.now() - request.at > FOCUS_WINDOW_MS) return;

    const enabledControl = (index, action) => {
      const node = controlsRef.current.get(`${index}:${action}`);
      return node && !node.disabled ? node : null;
    };

    let target = null;
    if (request.type === 'move') {
      const opposite = request.direction === 'up' ? 'down' : 'up';
      target =
        enabledControl(request.index, request.direction) ||
        enabledControl(request.index, opposite) ||
        enabledControl(request.index, 'remove');
    } else if (request.type === 'remove') {
      if (list.length > 0) {
        const index = Math.min(request.index, list.length - 1);
        target =
          enabledControl(index, 'remove') ||
          enabledControl(index, 'down') ||
          enabledControl(index, 'up');
      }
      if (!target && addButtonRef.current && !addButtonRef.current.disabled) {
        target = addButtonRef.current;
      }
    } else if (request.type === 'add') {
      const body = bodiesRef.current.get(request.index);
      target = (body && body.querySelector(FIRST_FIELD_SELECTOR)) || null;
      if (!target && body && typeof body.scrollIntoView === 'function') {
        body.scrollIntoView({ block: 'nearest' });
      }
    }
    if (target) target.focus();
  }, [list]);

  const registerControl = (index, action) => (node) => {
    const key = `${index}:${action}`;
    if (node) controlsRef.current.set(key, node);
    else controlsRef.current.delete(key);
  };

  const registerBody = (index) => (node) => {
    if (node) bodiesRef.current.set(index, node);
    else bodiesRef.current.delete(index);
  };

  let body;
  if (count === 0) {
    body = emptyState ?? (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">Nothing added yet</p>
        {canAdd ? (
          <p className="mt-1 text-sm text-slate-500">
            Use “{addLabel}” to add the first {String(itemLabel).toLowerCase()}.
          </p>
        ) : null}
      </div>
    );
  } else {
    body = (
      <ol role="list" className="space-y-4">
        {list.map((row, index) => {
          const number = index + 1;
          const isFirst = index === 0;
          const isLast = index === count - 1;
          const rowId = `${editorId}-row-${index}`;
          const titleId = `${rowId}-title`;
          const rowKey = getRowKey(row, index);
          const helpers = {
            update: (patch) => updateRow(index, patch),
            remove: () => removeRow(index),
            moveUp: () => moveRow(index, -1),
            moveDown: () => moveRow(index, 1),
            isFirst,
            isLast,
            index,
            count,
            canRemove,
            disabled,
            id: rowId,
          };

          return (
            <li key={rowKey ?? index}>
              <div
                role="group"
                aria-labelledby={titleId}
                className="rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-2">
                  <span id={titleId} className="text-sm font-medium text-slate-900">
                    {itemLabel} {number}
                  </span>
                  {!disabled ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {showReorder ? (
                        <>
                          <Button
                            ref={registerControl(index, 'up')}
                            variant="ghost"
                            size="icon"
                            className={ROW_ICON_BUTTON_CLASSES}
                            aria-label={`Move ${itemLabel} ${number} up`}
                            disabled={isFirst}
                            onClick={helpers.moveUp}
                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            ref={registerControl(index, 'down')}
                            variant="ghost"
                            size="icon"
                            className={ROW_ICON_BUTTON_CLASSES}
                            aria-label={`Move ${itemLabel} ${number} down`}
                            disabled={isLast}
                            onClick={helpers.moveDown}
                          >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </>
                      ) : null}
                      <Button
                        ref={registerControl(index, 'remove')}
                        variant="ghost"
                        size="icon"
                        className={cn(
                          ROW_ICON_BUTTON_CLASSES,
                          'hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-500',
                        )}
                        aria-label={`Remove ${itemLabel} ${number}`}
                        disabled={!canRemove}
                        onClick={helpers.remove}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div ref={registerBody(index)} className="p-4">
                  {renderRow ? renderRow(row, index, helpers) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={cn('space-y-4', className)} {...rest}>
      {body}
      {canCreate && !disabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            ref={addButtonRef}
            variant="outline"
            leftIcon={Plus}
            onClick={addRow}
            disabled={!canAdd}
          >
            {addLabel}
          </Button>
          {hasMax ? (
            <p className="text-xs text-slate-500" aria-live="polite">
              <span className="tabular-nums">
                {count} of {maxRows}
              </span>
              {count >= maxRows ? ' · limit reached' : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default DynamicRowEditor;
