import type { MaintenanceRecurrence } from './index.ts';

/**
 * Turning a maintenance schedule into concrete windows.
 *
 * A one-off maintenance is a single window. A recurring one is a series
 * anchored on its first window and repeated on the wall clock of the schedule's
 * time zone: "every Sunday at 02:00 for two hours" stays at 02:00 local across
 * a DST change, while each window keeps its absolute duration.
 *
 * Everything here is pure and shared between the API (which materialises the
 * next window) and the console (which previews the ones after it).
 */

export type MaintenanceSchedule = {
  /** Epoch ms of the first (or only) window. */
  startTime: number;
  /** Epoch ms of the first window's end; its distance from `startTime` is the duration. */
  endTime: number;
  recurrence: MaintenanceRecurrence | null;
  /** IANA zone the wall clock is read in. */
  timeZone: string;
};

export type MaintenanceWindow = { start: number; end: number };

type WallClock = {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const MINUTE = 60_000;

/**
 * Hard stop on a schedule walk, counted from where the walk starts. The walk
 * fast-forwards to the requested instant first, so this only bounds how far
 * past that instant a caller may look — never how old a series may be.
 */
const MAX_CANDIDATES = 5_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** True when the runtime knows the zone; the schedule refuses anything else. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** The zone's offset from UTC at `epoch`, in ms, such that wall = epoch + offset. */
function zoneOffset(epoch: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(epoch));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );
  return asUtc - Math.floor(epoch / 1000) * 1000;
}

export function toWallClock(epoch: number, timeZone: string): WallClock {
  const shifted = new Date(epoch + zoneOffset(epoch, timeZone));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/**
 * The instant a wall-clock time names in a zone. Across a DST gap (a local
 * time that never happens) the result lands after the gap; in an overlap (a
 * local time that happens twice) it is one of the two readings.
 */
export function fromWallClock(wall: WallClock, timeZone: string): number {
  // Read the wall clock as if it were UTC, then pull it back by the zone's
  // offset. The offset read at the guess can differ from the one at the
  // answer around a transition, so it is read twice.
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const firstOffset = zoneOffset(guess, timeZone);
  const first = guess - firstOffset;
  if (zoneOffset(first, timeZone) === firstOffset) {
    return first;
  }
  const secondOffset = zoneOffset(first, timeZone);
  const second = guess - secondOffset;
  if (zoneOffset(second, timeZone) === secondOffset) {
    return second;
  }
  return Math.max(first, second);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** A calendar date shifted by whole days, as a wall-clock date. */
function shiftDays(wall: WallClock, days: number): WallClock {
  const shifted = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days));
  return {
    ...wall,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function weekdayOf(wall: WallClock): number {
  return new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay();
}

function dateKey(wall: WallClock): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day);
}

const DAY_MS = 86_400_000;

/**
 * Where to pick up a series so the first candidates land just before
 * `from`: the step index whose window would start a step or so earlier. An
 * unbounded daily series is still cheap to read twenty years in. Off by a
 * step early is harmless — callers filter on the window end.
 */
function stepsBefore(anchor: WallClock, recurrence: MaintenanceRecurrence, from: number): number {
  const interval = Math.max(1, Math.floor(recurrence.interval));
  const fromWall = toWallClock(from, 'UTC');
  const elapsedDays = Math.floor((dateKey(fromWall) - dateKey(anchor)) / DAY_MS);
  let steps: number;
  switch (recurrence.frequency) {
    case 'DAILY':
      steps = Math.floor(elapsedDays / interval);
      break;
    case 'WEEKLY':
      steps = Math.floor(elapsedDays / (7 * interval));
      break;
    case 'MONTHLY': {
      const months = (fromWall.year - anchor.year) * 12 + (fromWall.month - anchor.month);
      steps = Math.floor(months / interval);
      break;
    }
  }
  // Two steps of slack: one for the wall clock reading a day off across
  // zones, one for a window that started before `from` and is still open.
  return Math.max(0, steps - 2);
}

/**
 * Every window start of the series in order, as wall-clock times, starting at
 * the anchor or, with `fromStep`, that many steps in. Infinite for a series
 * without `until`; callers bound it.
 */
function* wallClockStarts(
  anchor: WallClock,
  recurrence: MaintenanceRecurrence,
  fromStep = 0,
): Generator<WallClock> {
  const interval = Math.max(1, Math.floor(recurrence.interval));
  switch (recurrence.frequency) {
    case 'DAILY': {
      for (let n = fromStep; ; n += 1) {
        yield shiftDays(anchor, n * interval);
      }
    }
    case 'WEEKLY': {
      const weekdays = [...new Set(recurrence.byWeekday ?? [weekdayOf(anchor)])]
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b);
      if (weekdays.length === 0) {
        weekdays.push(weekdayOf(anchor));
      }
      // Weeks run Sunday to Saturday; the anchor's week is week zero, and
      // days in it before the anchor are not part of the series.
      const weekStart = shiftDays(anchor, -weekdayOf(anchor));
      const anchorKey = dateKey(anchor);
      for (let week = fromStep; ; week += 1) {
        for (const weekday of weekdays) {
          const candidate = shiftDays(weekStart, week * interval * 7 + weekday);
          if (dateKey(candidate) >= anchorKey) {
            yield candidate;
          }
        }
      }
    }
    case 'MONTHLY': {
      // A day the month does not have clamps to its last day: "the 31st of
      // every month" fires on the 30th of April rather than skipping it.
      for (let n = fromStep; ; n += 1) {
        const monthIndex = anchor.month - 1 + n * interval;
        const year = anchor.year + Math.floor(monthIndex / 12);
        const month = (monthIndex % 12) + 1;
        yield { ...anchor, year, month, day: Math.min(anchor.day, daysInMonth(year, month)) };
      }
    }
  }
}

/**
 * The series' windows in order, bounded by `until` and by the candidate cap.
 * A one-off schedule yields its single window. `from` skips ahead so the
 * first windows yielded are the ones around that instant; a window or two
 * before it may still come out, so callers filter on what they need.
 */
export function* maintenanceWindows(
  schedule: MaintenanceSchedule,
  from?: number,
): Generator<MaintenanceWindow> {
  const duration = Math.max(MINUTE, schedule.endTime - schedule.startTime);
  if (!schedule.recurrence) {
    yield { start: schedule.startTime, end: schedule.startTime + duration };
    return;
  }
  const anchor = toWallClock(schedule.startTime, schedule.timeZone);
  const until = schedule.recurrence.until ?? null;
  const fromStep =
    from === undefined || from <= schedule.startTime
      ? 0
      : stepsBefore(anchor, schedule.recurrence, from);
  let seen = 0;
  for (const wall of wallClockStarts(anchor, schedule.recurrence, fromStep)) {
    if (seen >= MAX_CANDIDATES) {
      return;
    }
    seen += 1;
    const start = fromWallClock(wall, schedule.timeZone);
    if (until != null && start > until) {
      return;
    }
    yield { start, end: start + duration };
  }
}

/** The window under way at `at`, if any. */
export function windowAt(schedule: MaintenanceSchedule, at: number): MaintenanceWindow | undefined {
  for (const window of maintenanceWindows(schedule, at)) {
    if (window.start > at) {
      return undefined;
    }
    if (window.end > at) {
      return window;
    }
  }
  return undefined;
}

/**
 * The first window still to finish at `at`: the one under way, else the next
 * to start. `afterStart` skips windows starting at or before that instant, so
 * a window completed early is not handed back as the next one.
 */
export function upcomingWindows(
  schedule: MaintenanceSchedule,
  at: number,
  options: { limit?: number; afterStart?: number } = {},
): MaintenanceWindow[] {
  const limit = options.limit ?? 1;
  const afterStart = options.afterStart ?? Number.NEGATIVE_INFINITY;
  const result: MaintenanceWindow[] = [];
  for (const window of maintenanceWindows(schedule, Math.max(at, afterStart))) {
    if (window.end <= at || window.start <= afterStart) {
      continue;
    }
    result.push(window);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function nextWindow(
  schedule: MaintenanceSchedule,
  at: number,
  afterStart?: number,
): MaintenanceWindow | undefined {
  return upcomingWindows(schedule, at, { limit: 1, afterStart })[0];
}
