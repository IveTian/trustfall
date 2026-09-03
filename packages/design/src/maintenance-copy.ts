import type { MaintenanceRecurrence } from '@trustfall/shared';
import { timeZoneLabel } from './time-zone.ts';

/**
 * Words for a maintenance schedule, shared by the public card and the
 * console so both describe a window the same way.
 */

/** "Sep 6, 2026, 02:00 – 04:00 (GMT+8)": one window, in the schedule's zone. */
export function formatWindow(start: number, end: number, timeZone?: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const range =
    typeof formatter.formatRange === 'function'
      ? formatter.formatRange(new Date(start), new Date(end))
      : `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
  return `${range} (${timeZoneLabel(timeZone, start)})`;
}

/** "Sep 6, 2026, 04:00 (GMT+8)": one instant, in the schedule's zone. */
export function formatInstant(at: number, timeZone?: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${formatter.format(new Date(at))} (${timeZoneLabel(timeZone, at)})`;
}

/** "2 hours", "45 minutes", "1 day 6 hours". */
export function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const rest = minutes % 60;
  const parts = [];
  if (days) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (rest || parts.length === 0) {
    parts.push(`${rest} ${rest === 1 ? 'minute' : 'minutes'}`);
  }
  return parts.join(' ');
}

function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join('');
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * "Every week on Sunday and Wednesday at 02:00 until Oct 1, 2026". `anchor`
 * is the first window's start, read in `timeZone` for the clock time and the
 * day of the month.
 */
export function describeRecurrence(
  recurrence: MaintenanceRecurrence,
  anchor: number,
  timeZone?: string,
): string {
  const interval = Math.max(1, recurrence.interval);
  const unit =
    recurrence.frequency === 'DAILY' ? 'day' : recurrence.frequency === 'WEEKLY' ? 'week' : 'month';
  const every = interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

  let on = '';
  if (recurrence.frequency === 'WEEKLY') {
    const weekday = new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', weekday: 'long' });
    const days = recurrence.byWeekday?.length
      ? recurrence.byWeekday
      : [weekdayIndex(anchor, timeZone)];
    // Samples are UTC midnights of a week that starts on Sunday, so the
    // weekday is the index itself and does not follow the viewer's zone.
    on = ` on ${joinNames(days.map((day) => weekday.format(new Date(Date.UTC(2026, 8, 6 + day)))))}`;
  } else if (recurrence.frequency === 'MONTHLY') {
    const day = Number(
      new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(anchor),
    );
    on = ` on the ${ordinal(day)}`;
  }

  const clock = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
  const at = ` at ${clock.format(anchor)}`;

  const until =
    recurrence.until == null
      ? ''
      : ` until ${new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: 'medium' }).format(recurrence.until)}`;

  return `${every}${on}${at}${until}`;
}

/** 0 = Sunday, for the instant read in the zone. */
export function weekdayIndex(at: number, timeZone?: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(at);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}
