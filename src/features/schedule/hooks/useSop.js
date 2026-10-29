import { useQuery } from '@tanstack/react-query';
import { getSop } from '@/services/applicationService';
import { queryKeys } from '@/services/queryKeys';

/**
 * Protected SOP for one day of an active enrollment (GP4):
 * { dayNumber, title, contentHtml (sanitised), watermarkText }.
 * The server sends `Cache-Control: no-store`, so the reader never keeps it around either:
 * no stale cache, dropped from memory as soon as the reader unmounts.
 */
export function useSop(enrollmentId, dayNumber, { enabled = true } = {}) {
  const validDay = Number.isInteger(dayNumber) && dayNumber > 0;
  return useQuery({
    queryKey: queryKeys.enrollments.sop(enrollmentId, dayNumber),
    queryFn: () => getSop(enrollmentId, dayNumber),
    enabled: enabled && Boolean(enrollmentId) && validDay,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
}

export default useSop;
