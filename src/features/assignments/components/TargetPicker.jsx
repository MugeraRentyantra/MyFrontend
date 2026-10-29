import { useId, useState } from 'react';
import { ErrorState, SearchBar, Skeleton, StatusBadge } from '@/shared/components/ui';
import { useDebounce } from '@/shared/hooks';
import { CheckCircle2, Search } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { useAssignmentTargets } from '../hooks/useAssignments';
import { TARGET_TYPE } from '../utils/assignmentHelpers';

/**
 * Searchable single-choice list of assignment targets (KD11): active individual enrollments or
 * teams. Native radios, so it is keyboard and screen-reader friendly. Key it by `type`.
 */
export function TargetPicker({ type, selected, onSelect, error, initialSearch = '' }) {
  const isTeam = type === TARGET_TYPE.TEAM;
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const query = useAssignmentTargets({ type, search: debouncedSearch });
  const groupName = useId();
  const errorId = useId();
  const hintId = useId();
  const options = query.data ?? [];
  const noun = isTeam ? 'team' : 'student enrollment';

  let content;
  if (query.isLoading) {
    content = (
      <div className="space-y-2 p-3" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full" rounded="lg" />
        ))}
      </div>
    );
  } else if (query.isError && options.length === 0) {
    content = <ErrorState compact error={query.error} onRetry={query.refetch} />;
  } else if (options.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
        <p className="text-sm text-slate-600">
          {debouncedSearch
            ? `No ${isTeam ? 'teams' : 'active enrollments'} match “${debouncedSearch}”.`
            : `No ${isTeam ? 'teams' : 'active enrollments'} yet.`}
        </p>
      </div>
    );
  } else {
    content = (
      <ul className={cn('divide-y divide-slate-100', query.isFetching && 'opacity-60')}>
        {options.map((option) => {
          const id = `${groupName}-${option.id}`;
          const checked = selected?.id === option.id;
          return (
            <li key={option.id}>
              <label
                htmlFor={id}
                className={cn(
                  'flex min-h-[3rem] items-center gap-3 px-3 py-2.5 transition-colors duration-150',
                  option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50',
                  checked && 'bg-brand-50/70 hover:bg-brand-50/70',
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name={groupName}
                  value={option.id}
                  checked={checked}
                  disabled={option.disabled}
                  onChange={() => onSelect(option)}
                  className="h-4 w-4 shrink-0 cursor-pointer accent-brand-600 disabled:cursor-not-allowed"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{option.name}</span>
                  {option.detail ? (
                    <span className="block truncate text-xs text-slate-500">{option.detail}</span>
                  ) : null}
                </span>
                {option.status ? <StatusBadge status={option.status} /> : null}
                {checked ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <fieldset
      className="min-w-0"
      aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(' ')}
      aria-busy={query.isFetching || undefined}
    >
      <legend className="text-sm font-medium text-slate-700">
        {isTeam ? 'Team' : 'Student enrollment'}
        <span aria-hidden="true" className="ml-0.5 text-rose-600">
          *
        </span>
        <span className="sr-only"> (required)</span>
      </legend>
      <SearchBar
        className="mt-2"
        value={search}
        onChange={setSearch}
        placeholder={isTeam ? 'Search teams by name…' : 'Search students by name or email…'}
        aria-label={isTeam ? 'Search teams' : 'Search student enrollments'}
      />
      <div
        className={cn(
          'scrollbar-thin mt-2 max-h-64 overflow-y-auto rounded-lg border bg-white',
          error ? 'border-rose-300' : 'border-slate-200',
        )}
      >
        {content}
      </div>
      <p id={hintId} className="mt-1.5 text-xs text-slate-500">
        {isTeam
          ? "Pick the team; its shared tasks go to this trainer. Disbanded teams can't be assigned."
          : 'Only active individual enrollments are listed. Team members are reviewed through their team.'}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {query.isLoading || query.isFetching ? '' : `${options.length} ${noun}${options.length === 1 ? '' : 's'} found`}
      </span>
    </fieldset>
  );
}

export default TargetPicker;
