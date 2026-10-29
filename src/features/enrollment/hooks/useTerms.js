import { useQuery } from '@tanstack/react-query';
import { getLatestTerms } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';

/** The latest published Terms & Conditions: { version, content (markdown), publishedAt } (SD5). */
export function useTerms(options = {}) {
  return useQuery({
    queryKey: queryKeys.terms.latest,
    queryFn: getLatestTerms,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export default useTerms;
