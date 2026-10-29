/**
 * Pure helpers for the day-wise schedule (GP3) and the SOP reader (GP4). No JSX, no React.
 */

export const DAYS_PER_WEEK = 7;

/** Days 1-7 -> week 1, days 8-14 -> week 2, ... */
export function weekOfDay(dayNumber) {
  return Math.max(1, Math.ceil(Number(dayNumber) / DAYS_PER_WEEK));
}

/** Copy of the days sorted by day number (the API already sorts; this keeps the UI safe). */
export function sortDays(days = []) {
  return [...(Array.isArray(days) ? days : [])].sort(
    (a, b) => Number(a.dayNumber) - Number(b.dayNumber),
  );
}

/**
 * Groups days into weeks: [{ week, firstDay, lastDay, days, completedCount, isComplete }].
 * `completedCount` only counts days the server marked `completed` (always 0 in a locked preview).
 */
export function groupDaysByWeek(days = []) {
  const groups = [];
  for (const day of sortDays(days)) {
    const week = weekOfDay(day.dayNumber);
    let group = groups[groups.length - 1];
    if (!group || group.week !== week) {
      group = { week, days: [] };
      groups.push(group);
    }
    group.days.push(day);
  }
  return groups.map((group) => {
    const completedCount = group.days.filter((day) => day.completed === true).length;
    return {
      ...group,
      firstDay: group.days[0].dayNumber,
      lastDay: group.days[group.days.length - 1].dayNumber,
      completedCount,
      isComplete: group.days.length > 0 && completedCount === group.days.length,
    };
  });
}

/** "Days 1–7" (or "Day 29" for a one-day week). */
export function formatDayRange(firstDay, lastDay) {
  return firstDay === lastDay ? `Day ${firstDay}` : `Days ${firstDay}–${lastDay}`;
}

/** The first day that is not completed yet (the student's next step), or null when all are done. */
export function findNextDay(days = []) {
  return sortDays(days).find((day) => !day.completed) ?? null;
}

export function countCompletedDays(days = []) {
  return (Array.isArray(days) ? days : []).filter((day) => day.completed === true).length;
}

/** Up to `count` days starting at the next incomplete day. Empty when every day is complete. */
export function getUpcomingDays(days = [], count = 3) {
  const sorted = sortDays(days);
  const start = sorted.findIndex((day) => !day.completed);
  if (start === -1) return [];
  return sorted.slice(start, start + count);
}

/**
 * Previous/next days that have an SOP, for the reader's navigation.
 * Without schedule data it falls back to the neighbouring day numbers (next stays unknown).
 */
export function getAdjacentSopDays(days, dayNumber) {
  const current = Number(dayNumber);
  if (!Array.isArray(days) || days.length === 0) {
    return {
      previous: current > 1 ? { dayNumber: current - 1, title: null } : null,
      next: null,
    };
  }
  const withSop = sortDays(days).filter((day) => day.hasSop);
  const previous = [...withSop].reverse().find((day) => day.dayNumber < current) ?? null;
  const next = withSop.find((day) => day.dayNumber > current) ?? null;
  return { previous, next };
}

/** Parses the `:day` route param: a positive integer, else null. */
export function parseDayParam(value) {
  if (typeof value !== 'string' || !/^\d{1,4}$/.test(value)) return null;
  const day = Number.parseInt(value, 10);
  return day > 0 ? day : null;
}

/** DOM id of a day card, used to scroll the next day into view. */
export function dayElementId(dayNumber) {
  return `schedule-day-${dayNumber}`;
}

/**
 * Scrolls a day card into view (instantly when the user prefers reduced motion).
 * `focus: true` also moves keyboard/screen-reader focus to it (the card has tabIndex=-1).
 */
export function scrollToDay(dayNumber, { focus = false } = {}) {
  if (typeof document === 'undefined') return false;
  const element = document.getElementById(dayElementId(dayNumber));
  if (!element) return false;
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  if (focus && typeof element.focus === 'function') element.focus({ preventScroll: true });
  return true;
}
