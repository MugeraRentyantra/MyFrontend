import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getQuote } from '@/services/applicationService';
import { isPast } from '@/shared/utils/helpers';
import { useIsExpired } from './useIsExpired';

function quoteKeyOf(planId, teamId) {
  return planId ? `${planId}:${teamId ?? ''}` : '';
}

/** True when a server quote belongs to this plan + team combination. */
export function quoteMatches(quote, planId, teamId) {
  if (!quote || !planId) return false;
  return quote.planId === planId && (quote.teamId ?? null) === (teamId ?? null);
}

/** A quote handed over from another page (navigation state) that can still be used. */
export function isUsableQuote(quote, planId, teamId) {
  return quoteMatches(quote, planId, teamId) && !isPast(quote.expiresAt);
}

/**
 * Server price quote for the selected plan (MM8). A quote is created with
 * POST /enrollments/quote, so this uses a mutation rather than a cached query: every request
 * returns a fresh, time-limited price, and all amounts come from the server.
 *
 * A new quote is requested whenever `planId` / `teamId` change while `enabled` is true.
 * Only the response to the latest request is kept, so switching plans quickly never shows a
 * stale price. `initialQuote` (e.g. handed over from the result page) is reused when it matches
 * the selection and has not expired.
 *
 * Returns { quote, error, isLoading (no quote yet for the selection), isFetching (request in
 * flight), isExpired, refresh() }.
 */
export function useQuote({ planId, teamId = null, enabled = true, initialQuote = null } = {}) {
  const key = quoteKeyOf(planId, teamId);
  const [state, setState] = useState(() =>
    isUsableQuote(initialQuote, planId, teamId)
      ? { key, quote: initialQuote, error: null }
      : { key: '', quote: null, error: null },
  );
  const requestedKey = useRef(state.key);
  // A handed-over quote not used yet (e.g. the plan list was still loading on the first render).
  const handedOver = useRef(state.key ? null : initialQuote);
  const latestRequest = useRef(0);
  const { mutateAsync, isPending, reset } = useMutation({ mutationFn: getQuote });

  const run = useCallback(
    async (nextPlanId, nextTeamId) => {
      const requestKey = quoteKeyOf(nextPlanId, nextTeamId);
      latestRequest.current += 1;
      const requestId = latestRequest.current;
      requestedKey.current = requestKey;
      try {
        const nextQuote = await mutateAsync({
          planId: nextPlanId,
          teamId: nextTeamId || undefined,
        });
        if (requestId === latestRequest.current) {
          setState({ key: requestKey, quote: nextQuote, error: null });
        }
        return nextQuote;
      } catch (requestError) {
        if (requestId === latestRequest.current) {
          setState({ key: requestKey, quote: null, error: requestError });
        }
        return null;
      }
    },
    [mutateAsync],
  );

  useEffect(() => {
    if (!key) {
      if (requestedKey.current) {
        requestedKey.current = '';
        latestRequest.current += 1;
        reset();
        setState({ key: '', quote: null, error: null });
      }
      return;
    }
    if (!enabled || requestedKey.current === key) return;
    if (isUsableQuote(handedOver.current, planId, teamId)) {
      const reused = handedOver.current;
      handedOver.current = null;
      requestedKey.current = key;
      latestRequest.current += 1;
      setState({ key, quote: reused, error: null });
      return;
    }
    run(planId, teamId);
  }, [key, enabled, planId, teamId, run, reset]);

  const refresh = useCallback(
    () => (planId ? run(planId, teamId) : Promise.resolve(null)),
    [planId, teamId, run],
  );

  const isCurrent = Boolean(key) && state.key === key;
  const quote = isCurrent ? state.quote : null;
  const error = isCurrent ? state.error : null;
  const expired = useIsExpired(quote?.expiresAt);

  return {
    quote,
    error,
    isLoading: Boolean(key) && !quote && !error,
    isFetching: Boolean(key) && isPending,
    isExpired: Boolean(quote) && expired,
    refresh,
  };
}

export default useQuote;
