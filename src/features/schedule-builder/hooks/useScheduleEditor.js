import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishSchedule, updateSchedule } from '@/services/adminScheduleService';
import { queryKeys } from '@/services/queryKeys';
import { toast } from '@/shared/components/ui';
import { SCHEDULE_STATUS } from '@/shared/constants';
import { getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { mapServerDayErrors, validateDays } from '../schemas/scheduleValidation';
import {
  dayFieldId,
  renumberDays,
  serializeDays,
  toDaysPayload,
  toEditableDays,
} from '../utils/days';

const NO_ERRORS = Object.freeze({});
const LOCKED_CODES = ['TEMPLATE_PUBLISHED', 'INVALID_TRANSITION'];

/** Moves keyboard focus to the first invalid day field once the errors have rendered. */
function focusFirstInvalidField(days, dayErrors) {
  const index = Object.keys(dayErrors)
    .map(Number)
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b)[0];
  if (index === undefined || !days[index]) return;
  const field = Object.keys(dayErrors[index])[0] ?? 'title';
  const focus = () => {
    const node = document.getElementById(dayFieldId(days[index].key, field));
    if (node) {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(focus);
  } else {
    setTimeout(focus, 0);
  }
}

/**
 * Local editing state for a schedule's days (KD6): unsaved-change tracking, validation (at least
 * one day, every day titled), save (PUT) and publish (PATCH). Published and archived versions are
 * read-only. Mount it with `key={schedule._id}` so switching versions starts fresh.
 */
export function useScheduleEditor(schedule) {
  const queryClient = useQueryClient();
  const scheduleId = schedule._id;
  const readOnly = schedule.status !== SCHEDULE_STATUS.DRAFT;

  const [days, setDaysState] = useState(() => toEditableDays(schedule.days));
  const [baseline, setBaseline] = useState(() => serializeDays(toEditableDays(schedule.days)));
  const [showErrors, setShowErrors] = useState(false);
  const [serverErrors, setServerErrors] = useState(null);

  const serialized = useMemo(() => serializeDays(days), [days]);
  const isDirty = !readOnly && serialized !== baseline;

  // Adopt fresh server data (after a save, a publish or a refetch) unless there are unsaved edits.
  const serverSignature = `${scheduleId}|${schedule.updatedAt ?? ''}|${schedule.status}`;
  const [syncedSignature, setSyncedSignature] = useState(serverSignature);
  if (syncedSignature !== serverSignature) {
    setSyncedSignature(serverSignature);
    if (!isDirty) {
      const next = toEditableDays(schedule.days, days);
      setDaysState(next);
      setBaseline(serializeDays(next));
      setServerErrors(null);
    }
  }

  const validation = useMemo(() => validateDays(days), [days]);

  const errors = useMemo(() => {
    const fromServer = serverErrors?.dayErrors ?? NO_ERRORS;
    const fromClient = showErrors ? validation.dayErrors : NO_ERRORS;
    const indexes = new Set([...Object.keys(fromClient), ...Object.keys(fromServer)]);
    const dayErrors = {};
    indexes.forEach((index) => {
      dayErrors[index] = { ...fromServer[index], ...fromClient[index] };
    });
    const formError = (showErrors ? validation.formError : null) ?? serverErrors?.formError ?? null;
    const count = Object.values(dayErrors).reduce((sum, item) => sum + Object.keys(item).length, 0);
    return { dayErrors, formError, count: count + (formError ? 1 : 0) };
  }, [serverErrors, showErrors, validation]);

  const setDays = useCallback((nextDays) => {
    setDaysState(renumberDays(nextDays));
    setServerErrors(null);
  }, []);

  const invalidateSchedules = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules }),
    [queryClient],
  );

  const applyServerResult = useCallback(
    (updated) => {
      if (updated && updated._id === scheduleId) {
        queryClient.setQueryData(queryKeys.admin.schedule(scheduleId), updated);
      }
      void invalidateSchedules();
    },
    [invalidateSchedules, queryClient, scheduleId],
  );

  const saveMutation = useMutation({
    mutationFn: (payloadDays) => updateSchedule(scheduleId, { days: payloadDays }),
    onSuccess: applyServerResult,
  });

  const publishMutation = useMutation({
    mutationFn: () => publishSchedule(scheduleId),
    onSuccess: applyServerResult,
  });

  /** Runs client validation; shows the errors and focuses the first one when invalid. */
  const checkValid = useCallback(() => {
    const result = validateDays(days);
    if (result.isValid) return true;
    setShowErrors(true);
    focusFirstInvalidField(days, result.dayErrors);
    return false;
  }, [days]);

  const handleWriteError = useCallback(
    (error, fallbackTitle) => {
      const mapped = mapServerDayErrors(error);
      if (mapped) {
        setServerErrors(mapped);
        focusFirstInvalidField(days, mapped.dayErrors);
      }
      if (LOCKED_CODES.some((code) => isErrorCode(error, code))) {
        toast.error('This version is locked', { description: getErrorMessage(error) });
        void invalidateSchedules();
        return;
      }
      toast.error(fallbackTitle, {
        description: mapped ? 'Fix the highlighted fields and try again.' : getErrorMessage(error),
      });
    },
    [days, invalidateSchedules],
  );

  /** PUT the days. Resolves to true when saved. */
  const save = useCallback(
    async ({ notify = true } = {}) => {
      if (readOnly || saveMutation.isPending) return false;
      if (!checkValid()) return false;
      const payload = toDaysPayload(days);
      try {
        await saveMutation.mutateAsync(payload);
        setBaseline(JSON.stringify(payload));
        setShowErrors(false);
        setServerErrors(null);
        if (notify) {
          toast.success('Draft saved', {
            description: `${payload.length} ${payload.length === 1 ? 'day' : 'days'} in version ${schedule.version}.`,
          });
        }
        return true;
      } catch (error) {
        handleWriteError(error, "Couldn't save the draft");
        return false;
      }
    },
    [checkValid, days, handleWriteError, readOnly, saveMutation, schedule.version],
  );

  /** Saves pending edits first, then PATCH publish. Resolves to true when published. */
  const publish = useCallback(async () => {
    if (readOnly || publishMutation.isPending) return false;
    if (isDirty) {
      const saved = await save({ notify: false });
      if (!saved) return false;
    } else if (!checkValid()) {
      return false;
    }
    try {
      const updated = await publishMutation.mutateAsync();
      toast.success(`Version ${updated?.version ?? schedule.version} published`, {
        description: 'New enrollments get this version. Active students keep their current one.',
      });
      return true;
    } catch (error) {
      handleWriteError(error, "Couldn't publish this version");
      return false;
    }
  }, [checkValid, handleWriteError, isDirty, publishMutation, readOnly, save, schedule.version]);

  /** Throws away unsaved edits and returns to the last saved days. */
  const discard = useCallback(() => {
    const next = toEditableDays(schedule.days, days);
    setDaysState(next);
    setBaseline(serializeDays(next));
    setShowErrors(false);
    setServerErrors(null);
  }, [days, schedule.days]);

  return {
    days,
    setDays,
    readOnly,
    isDirty,
    errors,
    isValid: validation.isValid,
    checkValid,
    save,
    publish,
    discard,
    isSaving: saveMutation.isPending,
    isPublishing: publishMutation.isPending,
  };
}

/**
 * Unsaved-changes guard: blocks in-app navigation (useBlocker) and warns on reload / tab close
 * (beforeunload) while `when` is true. Render a dialog when `blocker.state === 'blocked'` and call
 * `blocker.proceed()` or `blocker.reset()`.
 */
export function useUnsavedChangesGuard(when) {
  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      Boolean(when) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
    [when],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!when) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Older browsers need returnValue set to show the native prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  // Saved while the prompt was open: nothing to lose any more, so let the navigation through.
  useEffect(() => {
    if (blocker.state === 'blocked' && !when) blocker.proceed();
  }, [blocker, when]);

  return blocker;
}
