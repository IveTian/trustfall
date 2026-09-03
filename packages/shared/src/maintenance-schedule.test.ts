import { describe, expect, it } from 'vitest';
import {
  fromWallClock,
  isValidTimeZone,
  maintenanceWindows,
  nextWindow,
  toWallClock,
  upcomingWindows,
  windowAt,
  type MaintenanceSchedule,
} from './maintenance-schedule.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function take(schedule: MaintenanceSchedule, count: number) {
  const out = [];
  for (const window of maintenanceWindows(schedule)) {
    out.push(window);
    if (out.length >= count) {
      break;
    }
  }
  return out;
}

describe('wall clock conversion', () => {
  it('round-trips through a zone with an offset', () => {
    const epoch = Date.UTC(2026, 8, 3, 18, 0); // 02:00 next day in Shanghai
    const wall = toWallClock(epoch, 'Asia/Shanghai');
    expect(wall).toEqual({ year: 2026, month: 9, day: 4, hour: 2, minute: 0 });
    expect(fromWallClock(wall, 'Asia/Shanghai')).toBe(epoch);
  });

  it('lands after a DST gap rather than inside it', () => {
    // 2026-03-08 02:30 never happens in New York; the clock jumps to 03:00.
    const epoch = fromWallClock(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      'America/New_York',
    );
    expect(toWallClock(epoch, 'America/New_York').hour).toBe(3);
  });

  it('knows a real zone from a made-up one', () => {
    expect(isValidTimeZone('Europe/Berlin')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});

describe('maintenanceWindows', () => {
  const start = Date.UTC(2026, 8, 6, 2, 0);

  it('yields a one-off schedule as its single window', () => {
    const schedule: MaintenanceSchedule = {
      startTime: start,
      endTime: start + 2 * HOUR,
      recurrence: null,
      timeZone: 'UTC',
    };
    expect([...maintenanceWindows(schedule)]).toEqual([{ start, end: start + 2 * HOUR }]);
  });

  it('repeats daily on the wall clock across a DST change', () => {
    // 02:00 Berlin every day; on 2026-10-25 the clocks fall back an hour.
    const anchor = fromWallClock(
      { year: 2026, month: 10, day: 24, hour: 2, minute: 0 },
      'Europe/Berlin',
    );
    const schedule: MaintenanceSchedule = {
      startTime: anchor,
      endTime: anchor + HOUR,
      recurrence: { frequency: 'DAILY', interval: 1 },
      timeZone: 'Europe/Berlin',
    };
    const windows = take(schedule, 3);
    expect(windows.map((window) => toWallClock(window.start, 'Europe/Berlin').hour)).toEqual([
      2, 2, 2,
    ]);
    // The absolute gap between day one and day two is 25 hours, not 24.
    expect(windows[1]!.start - windows[0]!.start).toBe(25 * HOUR);
    expect(windows[2]!.start - windows[1]!.start).toBe(24 * HOUR);
  });

  it('steps by the interval', () => {
    const schedule: MaintenanceSchedule = {
      startTime: start,
      endTime: start + HOUR,
      recurrence: { frequency: 'DAILY', interval: 3 },
      timeZone: 'UTC',
    };
    expect(take(schedule, 3).map((window) => window.start)).toEqual([
      start,
      start + 3 * DAY,
      start + 6 * DAY,
    ]);
  });

  it('picks the chosen weekdays and skips the anchor week days before the anchor', () => {
    // 2026-09-06 is a Sunday. Sundays and Wednesdays, anchored on Wednesday
    // the 9th: the Sunday before it is not part of the series.
    const anchor = Date.UTC(2026, 8, 9, 2, 0);
    const schedule: MaintenanceSchedule = {
      startTime: anchor,
      endTime: anchor + HOUR,
      recurrence: { frequency: 'WEEKLY', interval: 1, byWeekday: [3, 0] },
      timeZone: 'UTC',
    };
    expect(take(schedule, 3).map((window) => new Date(window.start).toISOString())).toEqual([
      '2026-09-09T02:00:00.000Z',
      '2026-09-13T02:00:00.000Z',
      '2026-09-16T02:00:00.000Z',
    ]);
  });

  it('defaults a weekly series to the anchor weekday', () => {
    const schedule: MaintenanceSchedule = {
      startTime: start,
      endTime: start + HOUR,
      recurrence: { frequency: 'WEEKLY', interval: 2 },
      timeZone: 'UTC',
    };
    expect(take(schedule, 2).map((window) => window.start)).toEqual([start, start + 14 * DAY]);
  });

  it('clamps a monthly day to the end of a shorter month', () => {
    const anchor = Date.UTC(2026, 0, 31, 2, 0);
    const schedule: MaintenanceSchedule = {
      startTime: anchor,
      endTime: anchor + HOUR,
      recurrence: { frequency: 'MONTHLY', interval: 1 },
      timeZone: 'UTC',
    };
    expect(take(schedule, 3).map((window) => new Date(window.start).toISOString())).toEqual([
      '2026-01-31T02:00:00.000Z',
      '2026-02-28T02:00:00.000Z',
      '2026-03-31T02:00:00.000Z',
    ]);
  });

  it('stops at until', () => {
    const schedule: MaintenanceSchedule = {
      startTime: start,
      endTime: start + HOUR,
      recurrence: { frequency: 'DAILY', interval: 1, until: start + 2 * DAY },
      timeZone: 'UTC',
    };
    expect([...maintenanceWindows(schedule)]).toHaveLength(3);
  });
});

describe('windowAt and nextWindow', () => {
  const start = Date.UTC(2026, 8, 6, 2, 0);
  const schedule: MaintenanceSchedule = {
    startTime: start,
    endTime: start + 2 * HOUR,
    recurrence: { frequency: 'DAILY', interval: 1 },
    timeZone: 'UTC',
  };

  it('finds the window under way', () => {
    expect(windowAt(schedule, start + HOUR)).toEqual({ start, end: start + 2 * HOUR });
    expect(windowAt(schedule, start + DAY + HOUR)).toEqual({
      start: start + DAY,
      end: start + DAY + 2 * HOUR,
    });
  });

  it('has no window between two windows or before the first', () => {
    expect(windowAt(schedule, start + 3 * HOUR)).toBeUndefined();
    expect(windowAt(schedule, start - 1)).toBeUndefined();
  });

  it('hands back the window under way, else the next to start', () => {
    expect(nextWindow(schedule, start + HOUR)?.start).toBe(start);
    expect(nextWindow(schedule, start + 3 * HOUR)?.start).toBe(start + DAY);
  });

  it('skips a window that was completed early', () => {
    expect(nextWindow(schedule, start + HOUR, start)?.start).toBe(start + DAY);
  });

  it('lists the upcoming windows in order', () => {
    expect(upcomingWindows(schedule, start + 3 * HOUR, { limit: 2 })).toEqual([
      { start: start + DAY, end: start + DAY + 2 * HOUR },
      { start: start + 2 * DAY, end: start + 2 * DAY + 2 * HOUR },
    ]);
  });

  it('reads an unbounded series decades in without walking every window', () => {
    const twentyYears = start + 20 * 365 * DAY;
    const next = nextWindow(schedule, twentyYears);
    expect(next).toBeDefined();
    expect(next!.start).toBeGreaterThanOrEqual(twentyYears - 2 * HOUR);
    expect(next!.end).toBeGreaterThan(twentyYears);
    expect(toWallClock(next!.start, 'UTC').hour).toBe(2);
  });

  it('fast-forwards a monthly series without skipping its window', () => {
    const monthly: MaintenanceSchedule = {
      ...schedule,
      recurrence: { frequency: 'MONTHLY', interval: 1 },
    };
    const later = Date.UTC(2031, 8, 6, 1, 0);
    expect(nextWindow(monthly, later)?.start).toBe(Date.UTC(2031, 8, 6, 2, 0));
  });

  it('runs out for a one-off whose window has passed', () => {
    const once: MaintenanceSchedule = { ...schedule, recurrence: null };
    expect(nextWindow(once, start + 3 * HOUR)).toBeUndefined();
  });
});
