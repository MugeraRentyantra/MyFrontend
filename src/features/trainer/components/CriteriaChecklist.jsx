import { useId, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Checkbox } from '@/shared/components/ui';
import { CheckCircle2 } from '@/shared/icons';

/**
 * KD10 review aid: the task's acceptance criteria with local checkboxes. Nothing here is saved or
 * sent to the student; it only helps the trainer work through the list. Remount (key) per submission.
 */
export function CriteriaChecklist({ criteria }) {
  const list = Array.isArray(criteria)
    ? criteria.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
  const [checked, setChecked] = useState(() => new Set());
  const baseId = useId();
  const doneCount = list.filter((_, index) => checked.has(index)).length;
  const allDone = list.length > 0 && doneCount === list.length;

  const toggle = (index, value) => {
    setChecked((previous) => {
      const next = new Set(previous);
      if (value) next.add(index);
      else next.delete(index);
      return next;
    });
  };

  return (
    <Card as="section" padding="none" aria-label="Acceptance criteria">
      <CardHeader
        title="Acceptance criteria"
        description="Tick each one as you check it. This is a private aid: it isn't saved or shared."
        action={
          doneCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setChecked(new Set())}>
              Clear
            </Button>
          ) : null
        }
      />
      <CardBody>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">This task has no acceptance criteria listed.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {list.map((criterion, index) => (
                // Criteria are plain strings that can repeat, so the index is part of the key.
                // eslint-disable-next-line react/no-array-index-key
                <li key={`${index}-${criterion}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <Checkbox
                    id={`${baseId}-criterion-${index}`}
                    checked={checked.has(index)}
                    onChange={(event) => toggle(index, event.target.checked)}
                    label={
                      <span className={checked.has(index) ? 'text-slate-500 line-through' : undefined}>
                        {criterion}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
            <p
              className="mt-4 flex items-center gap-1.5 text-sm text-slate-600"
              role="status"
              aria-live="polite"
            >
              {allDone ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              ) : null}
              <span className="tabular">
                {doneCount} of {list.length}
              </span>{' '}
              checked
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export default CriteriaChecklist;
