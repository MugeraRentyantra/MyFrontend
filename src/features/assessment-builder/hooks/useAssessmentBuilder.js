import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAssessmentConfig,
  getAssessmentConfigs,
  publishAssessmentConfig,
  saveAssessmentConfig,
} from '@/services/adminCatalogService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Assessment builder data (KD5, MM7): one config per designation, saved as drafts and published as
 * numbered versions. Students who already took the assessment keep their result.
 */

const selectSummaries = (data) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

/** One summary per designation: { designationId, designation, configId, version, status, questionCount, publishedVersion, updatedAt }. */
export function useAssessmentConfigs(options = {}) {
  return useQuery({
    queryKey: queryKeys.admin.assessments,
    queryFn: () => getAssessmentConfigs(),
    select: selectSummaries,
    ...options,
  });
}

/** Latest config (draft or published) with answer keys; `data` is null when none exists yet. */
export function useAssessmentConfig(designationId, options = {}) {
  return useQuery({
    queryKey: queryKeys.admin.assessment(designationId),
    queryFn: () => getAssessmentConfig(designationId),
    enabled: Boolean(designationId),
    // A background refetch must never look like it replaced what the admin is editing.
    refetchOnWindowFocus: false,
    ...options,
  });
}

/** True when a response looks like an assessment config (so it can go straight into the cache). */
export function isAssessmentConfig(value) {
  return Boolean(
    value && typeof value === 'object' && Array.isArray(value.questions) && value.version !== undefined,
  );
}

function refreshAfterChange(queryClient, designationId, result) {
  if (isAssessmentConfig(result)) {
    queryClient.setQueryData(queryKeys.admin.assessment(designationId), result);
  } else {
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.assessment(designationId), exact: true });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.admin.assessments, exact: true });
}

/** mutate({ questions, discountSlabs }) -> the saved DRAFT. Allowed while the draft is incomplete. */
export function useSaveAssessmentDraft(designationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => saveAssessmentConfig(designationId, payload),
    onSuccess: (saved) => refreshAfterChange(queryClient, designationId, saved),
  });
}

/** mutate() -> publishes the saved draft as the live version (422 with details when not ready). */
export function usePublishAssessment(designationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishAssessmentConfig(designationId),
    onSuccess: (published) => {
      refreshAfterChange(queryClient, designationId, published);
      // Students fetch the published questions; drop any cached copy.
      queryClient.invalidateQueries({ queryKey: queryKeys.assessment.all });
    },
  });
}

/**
 * Blocks in-app navigation (useBlocker) and warns on reload/close (beforeunload) while `when` is
 * true. Returns the blocker: render a confirmation when `blocker.state === 'blocked'` and call
 * `blocker.proceed()` or `blocker.reset()`.
 */
export function useUnsavedChangesGuard(when) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      Boolean(when) &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );

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

  // If the changes get saved while the prompt is showing, there is nothing left to protect.
  useEffect(() => {
    if (blocker.state === 'blocked' && !when) blocker.reset();
  }, [blocker, when]);

  return blocker;
}
