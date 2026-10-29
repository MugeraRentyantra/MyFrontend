/**
 * Prerequisite graph helpers for task definitions (KD7). Pure functions, no React.
 * A task lists the tasks it needs in `prerequisiteTaskIds`, so edges point from a task to its
 * prerequisites. The server re-checks everything; these helpers only give instant feedback.
 */

function prerequisitesOf(task) {
  return Array.isArray(task?.prerequisiteTaskIds) ? task.prerequisiteTaskIds : [];
}

/** Map of taskId -> direct prerequisite ids (ids of unknown tasks are ignored). */
export function buildPrerequisiteMap(tasks = []) {
  const ids = new Set(tasks.map((task) => task._id));
  const map = new Map();
  tasks.forEach((task) => {
    map.set(
      task._id,
      prerequisitesOf(task).filter((id) => ids.has(id)),
    );
  });
  return map;
}

/** True when `fromId` needs `targetId`, directly or through other prerequisites. */
export function dependsOn(tasks, fromId, targetId, map = buildPrerequisiteMap(tasks)) {
  if (!fromId || !targetId) return false;
  const seen = new Set();
  const stack = [...(map.get(fromId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === targetId) return true;
    if (!seen.has(id)) {
      seen.add(id);
      stack.push(...(map.get(id) ?? []));
    }
  }
  return false;
}

/**
 * Whether making `prerequisiteId` a prerequisite of `taskId` would create a loop, i.e. the
 * prerequisite already depends on the task. A new task (no id yet) can never close a loop.
 */
export function wouldCreateCycle(tasks, taskId, prerequisiteId, map) {
  if (!taskId || !prerequisiteId) return false;
  if (taskId === prerequisiteId) return true;
  return dependsOn(tasks, prerequisiteId, taskId, map ?? buildPrerequisiteMap(tasks));
}

/** Tasks that list `taskId` as a direct prerequisite. */
export function getDependents(tasks = [], taskId) {
  if (!taskId) return [];
  return tasks.filter((task) => prerequisitesOf(task).includes(taskId));
}

/** New array with the item at `from` moved to `to` (indexes are clamped). */
export function moveItem(list = [], from, to) {
  const next = list.slice();
  if (from < 0 || from >= next.length) return next;
  const target = Math.max(0, Math.min(next.length - 1, to));
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * The first ordering problem in `orderedTasks`: a task placed before one of its prerequisites.
 * Returns `{ task, prerequisite }`, or null when every task comes after what it needs.
 */
export function findOrderViolation(orderedTasks = []) {
  const position = new Map(orderedTasks.map((task, index) => [task._id, index]));
  for (let index = 0; index < orderedTasks.length; index += 1) {
    const task = orderedTasks[index];
    for (const prerequisiteId of prerequisitesOf(task)) {
      const prerequisiteIndex = position.get(prerequisiteId);
      if (prerequisiteIndex !== undefined && prerequisiteIndex > index) {
        return { task, prerequisite: orderedTasks[prerequisiteIndex] };
      }
    }
  }
  return null;
}
