import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES, rollupOverallStatus } from '@trustfall/shared';
import { componentSegments } from './affected-segments.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** How often an interval is sampled when bucketing into days: twice a day clears a 23-hour DST day. */
const SAMPLE_MS = DAY_MS / 2;

/** How many days the public history bar covers, today included. */
export const HISTORY_DAYS = 90;

/** What put a component in a status: the incident or maintenance, and where to read it. */
export type HistorySource = {
  kind: 'incident' | 'maintenance';
  id: string;
  title: string;
  href?: string;
};

/** A stretch of time one component spent in a status other than operational. */
export type StatusInterval = {
  start: number;
  end: number;
  status: ComponentStatus;
  source: HistorySource;
};

/**
 * What one source did to a component on one day: its worst status that day
 * and the whole stretch it was affected, which may run past the day on
 * either side.
 */
export type DayEvent = {
  source: HistorySource;
  status: ComponentStatus;
  start: number;
  end: number;
};

/**
 * One cell of the bar: the calendar day (`YYYY-MM-DD` in the reader's zone),
 * the worst it saw, and what caused it — empty on a clean day.
 */
export type DayStatus = { key: string; status: ComponentStatus; events: DayEvent[] };

type HistoryIncident = {
  id: string;
  title: string;
  href?: string;
  startTime: number;
  resolveTime?: number | null;
  components: Array<{ componentId: string }>;
  updates: Array<{
    createTime: number;
    components?: Array<{ componentId: string; status: ComponentStatus }>;
  }>;
};

type HistoryMaintenance = {
  id: string;
  title: string;
  href?: string;
  components: Array<{ componentId: string }>;
  updates: Array<{ createTime: number; status: string }>;
};

/**
 * Every non-operational stretch each component went through, read off the
 * incidents' update snapshots and the maintenances' start/finish entries.
 * An incident still open, or a maintenance still under way, runs to `now`.
 * Keyed by component id; a component with a clean record has no entry.
 */
export function historyIntervals(
  { incidents, maintenances }: { incidents: HistoryIncident[]; maintenances: HistoryMaintenance[] },
  now: number,
): Map<string, StatusInterval[]> {
  const byComponent = new Map<string, StatusInterval[]>();
  const push = (componentId: string, interval: StatusInterval) => {
    if (interval.status === 'OPERATIONAL' || interval.end <= interval.start) {
      return;
    }
    const list = byComponent.get(componentId) ?? [];
    list.push(interval);
    byComponent.set(componentId, list);
  };

  for (const incident of incidents) {
    const source: HistorySource = {
      kind: 'incident',
      id: incident.id,
      title: incident.title,
      ...(incident.href ? { href: incident.href } : null),
    };
    const end = incident.resolveTime ?? Math.max(now, incident.startTime);
    const ids = new Set<string>(incident.components.map((item) => item.componentId));
    for (const update of incident.updates) {
      for (const item of update.components ?? []) {
        ids.add(item.componentId);
      }
    }
    for (const id of ids) {
      const segments = componentSegments(
        id,
        incident.updates,
        incident.startTime,
        incident.startTime,
        end,
      );
      for (const segment of segments) {
        push(id, { ...segment, source });
      }
    }
  }

  for (const maintenance of maintenances) {
    const source: HistorySource = {
      kind: 'maintenance',
      id: maintenance.id,
      title: maintenance.title,
      ...(maintenance.href ? { href: maintenance.href } : null),
    };
    const sorted = [...maintenance.updates].sort((a, b) => a.createTime - b.createTime);
    let openedAt: number | undefined;
    for (const update of sorted) {
      if (update.status === 'IN_PROGRESS') {
        openedAt ??= update.createTime;
      } else if (openedAt !== undefined) {
        for (const item of maintenance.components) {
          push(item.componentId, {
            start: openedAt,
            end: update.createTime,
            status: 'UNDER_MAINTENANCE',
            source,
          });
        }
        openedAt = undefined;
      }
    }
    if (openedAt !== undefined) {
      for (const item of maintenance.components) {
        push(item.componentId, {
          start: openedAt,
          end: now,
          status: 'UNDER_MAINTENANCE',
          source,
        });
      }
    }
  }

  return byComponent;
}

function keyFormatter(timeZone: string): Intl.DateTimeFormat {
  // en-CA writes dates as YYYY-MM-DD, which sorts and compares as text.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function safeKeyFormatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return keyFormatter(timeZone);
  } catch {
    return keyFormatter('UTC');
  }
}

/** The calendar day an instant falls on in the zone, as `YYYY-MM-DD`. */
export function dayKey(at: number, timeZone: string): string {
  return safeKeyFormatter(timeZone).format(new Date(at));
}

/**
 * The last `days` calendar days in the zone, oldest first and today last.
 * Counted on the calendar, not in 24-hour steps, so a DST change neither
 * repeats nor drops a day.
 */
export function dayKeys(now: number, timeZone: string, days = HISTORY_DAYS): string[] {
  const today = dayKey(now, timeZone);
  const [year, month, day] = today.split('-').map(Number) as [number, number, number];
  const utc = keyFormatter('UTC');
  const keys: string[] = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    keys.push(utc.format(new Date(Date.UTC(year, month - 1, day - back))));
  }
  return keys;
}

/**
 * The bar's cells: each of the last `days` days, oldest on the left and today
 * on the right, carrying the worst status any interval put the component in
 * that day and the events behind it, one per source, worst first. A day
 * nothing touched is operational with no events.
 */
export function dailyStatuses(
  intervals: readonly StatusInterval[],
  now: number,
  timeZone: string,
  days = HISTORY_DAYS,
): DayStatus[] {
  const keys = dayKeys(now, timeZone, days);
  // Per day, per source: the source's segments folded into one event.
  const touched = new Map<string, Map<string, DayEvent>>();
  const windowStart = new Date(`${keys[0]}T00:00:00Z`).getTime() - DAY_MS;
  const mark = (at: number, interval: StatusInterval) => {
    const key = dayKey(at, timeZone);
    const events = touched.get(key) ?? new Map<string, DayEvent>();
    touched.set(key, events);
    const id = `${interval.source.kind}:${interval.source.id}`;
    const event = events.get(id);
    if (event) {
      event.status = rollupOverallStatus([event.status, interval.status]);
      event.start = Math.min(event.start, interval.start);
      event.end = Math.max(event.end, interval.end);
    } else {
      events.set(id, {
        source: interval.source,
        status: interval.status,
        start: interval.start,
        end: interval.end,
      });
    }
  };

  for (const interval of intervals) {
    const start = Math.max(interval.start, windowStart);
    const end = Math.min(interval.end, now);
    if (end <= start) {
      continue;
    }
    for (let at = start; at < end; at += SAMPLE_MS) {
      mark(at, interval);
    }
    mark(end - 1, interval);
  }

  return keys.map((key) => {
    const events = [...(touched.get(key)?.values() ?? [])].sort(
      (a, b) => severityOf(b.status) - severityOf(a.status) || a.start - b.start,
    );
    return {
      key,
      status: rollupOverallStatus(events.map((event) => event.status)),
      events,
    };
  });
}

function severityOf(status: ComponentStatus): number {
  return COMPONENT_STATUSES.indexOf(status);
}
