/** Display helpers shared by the schedule-builder screens (no JSX). */

/** "Java Developer · Banking" */
export function scheduleName(schedule) {
  const designation = schedule?.designation?.name ?? 'Unknown designation';
  const domain = schedule?.domain?.name ?? 'Unknown domain';
  return `${designation} · ${domain}`;
}

/** "6 h", "1.5 h" */
export function formatHours(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return '—';
  return `${Number.isInteger(value) ? value : value.toFixed(1)} h`;
}

/** "Day 3 · Build the login API" */
export function dayLabel(day) {
  if (!day) return '';
  const title = String(day.title ?? '').trim();
  return title ? `Day ${day.dayNumber} · ${title}` : `Day ${day.dayNumber}`;
}
