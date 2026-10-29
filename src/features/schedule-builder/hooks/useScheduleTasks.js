import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/services/queryKeys';
import {
  createTask,
  deleteTask,
  getScheduleTasks,
  reorderTasks,
  updateTask,
} from '@/services/adminScheduleService';
import { toItems } from './useSchedules';

function selectTasks(data) {
  return [...toItems(data)].sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
}

/** Writes a new order into the cached list (keeps the cached shape: array or { items }). */
function applyOrder(data, orderedIds) {
  const items = toItems(data);
  const byId = new Map(items.map((task) => [task._id, task]));
  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((task, index) => ({ ...task, sequence: index + 1 }));
  const missing = items
    .filter((task) => !orderedIds.includes(task._id))
    .map((task, index) => ({ ...task, sequence: ordered.length + index + 1 }));
  const next = [...ordered, ...missing];
  if (Array.isArray(data)) return next;
  if (data && Array.isArray(data.items)) return { ...data, items: next };
  return data;
}

/** Task definitions of one schedule version, ordered by sequence. */
export function useScheduleTasks(templateId) {
  return useQuery({
    queryKey: queryKeys.admin.scheduleTasks(templateId),
    queryFn: () => getScheduleTasks(templateId),
    enabled: Boolean(templateId),
    select: selectTasks,
  });
}

/** Create (no taskId) or update a task definition. */
export function useSaveTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }) => (taskId ? updateTask(taskId, data) : createTask(data)),
    onSuccess: () => {
      // Prefix match: refreshes this version's tasks, its task count in lists and its versions.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules });
    },
  });
}

/** PATCH reorder with an optimistic update; the previous order is restored if the server says no. */
export function useReorderTasks(templateId) {
  const queryClient = useQueryClient();
  const key = queryKeys.admin.scheduleTasks(templateId);
  return useMutation({
    mutationFn: (orderedIds) => reorderTasks(templateId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      if (previous !== undefined) {
        queryClient.setQueryData(key, (data) => applyOrder(data, orderedIds));
      }
      return { previous };
    },
    onSuccess: (data) => {
      // The server answers with the list in its new order: use it as the source of truth.
      if (Array.isArray(data) || Array.isArray(data?.items)) queryClient.setQueryData(key, data);
      else void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (_error, _orderedIds, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(key, context.previous);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
