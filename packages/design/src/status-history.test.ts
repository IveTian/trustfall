import { describe, expect, it } from 'vitest';
import {
  dailyStatuses,
  dayKeys,
  historyIntervals,
  type HistorySource,
  type StatusInterval,
} from './status-history.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// A Thursday at noon UTC.
const NOW = Date.UTC(2026, 8, 3, 12);

const INC: HistorySource = {
  kind: 'incident',
  id: 'inc_1',
  title: 'API errors',
  href: '/incidents/inc_1',
};
const OTHER: HistorySource = { kind: 'incident', id: 'inc_2', title: 'CDN slow' };
const MAINT: HistorySource = { kind: 'maintenance', id: 'mnt_1', title: 'DB upgrade' };

const between = (
  start: number,
  end: number,
  status: StatusInterval['status'],
  source: HistorySource = INC,
): StatusInterval => ({ start, end, status, source });

describe('dayKeys', () => {
  it('ends on today and counts back on the calendar', () => {
    const keys = dayKeys(NOW, 'UTC', 3);
    expect(keys).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('follows the zone: late UTC evening is already tomorrow in Tokyo', () => {
    const late = Date.UTC(2026, 8, 3, 20);
    expect(dayKeys(late, 'UTC', 1)).toEqual(['2026-09-03']);
    expect(dayKeys(late, 'Asia/Tokyo', 1)).toEqual(['2026-09-04']);
  });

  it('crosses a month boundary without gaps', () => {
    expect(dayKeys(Date.UTC(2026, 2, 1, 12), 'UTC', 3)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });

  it('neither repeats nor drops a day across a DST change', () => {
    // US spring forward 2026-03-08; ask for the week around it in New York.
    const keys = dayKeys(Date.UTC(2026, 2, 11, 12), 'America/New_York', 7);
    expect(keys).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
    ]);
  });
});

describe('dailyStatuses', () => {
  it('is all operational with nothing recorded', () => {
    const days = dailyStatuses([], NOW, 'UTC', 90);
    expect(days).toHaveLength(90);
    expect(days.every((day) => day.status === 'OPERATIONAL')).toBe(true);
    expect(days.at(-1)?.key).toBe('2026-09-03');
  });

  it('paints every day an interval touches, worst status winning', () => {
    const days = dailyStatuses(
      [
        between(NOW - 2 * DAY - HOUR, NOW - DAY + HOUR, 'DEGRADED_PERFORMANCE'),
        between(NOW - DAY, NOW - DAY + 10 * 60 * 1000, 'MAJOR_OUTAGE', OTHER),
      ],
      NOW,
      'UTC',
      4,
    );
    expect(days.map((day) => day.status)).toEqual([
      'OPERATIONAL',
      'DEGRADED_PERFORMANCE',
      'MAJOR_OUTAGE',
      'OPERATIONAL',
    ]);
  });

  it('a short blip inside one day still marks that day', () => {
    const days = dailyStatuses(
      [between(NOW - 5 * 60 * 1000, NOW - 60 * 1000, 'PARTIAL_OUTAGE')],
      NOW,
      'UTC',
      2,
    );
    expect(days.map((day) => day.status)).toEqual(['OPERATIONAL', 'PARTIAL_OUTAGE']);
  });

  it('ignores what lies outside the window and clips an open interval at now', () => {
    const days = dailyStatuses(
      [
        between(NOW - 400 * DAY, NOW - 300 * DAY, 'MAJOR_OUTAGE'),
        between(NOW - HOUR, NOW + 10 * DAY, 'UNDER_MAINTENANCE', MAINT),
      ],
      NOW,
      'UTC',
      3,
    );
    expect(days.map((day) => day.status)).toEqual([
      'OPERATIONAL',
      'OPERATIONAL',
      'UNDER_MAINTENANCE',
    ]);
  });

  it('lists the events behind a day, one per source, worst first', () => {
    const days = dailyStatuses(
      [
        between(NOW - DAY - HOUR, NOW - DAY + HOUR, 'DEGRADED_PERFORMANCE', OTHER),
        between(NOW - 3 * HOUR, NOW - 2 * HOUR, 'DEGRADED_PERFORMANCE'),
        between(NOW - 2 * HOUR, NOW - HOUR, 'MAJOR_OUTAGE'),
        between(NOW - HOUR, NOW, 'UNDER_MAINTENANCE', MAINT),
      ],
      NOW,
      'UTC',
      2,
    );
    expect(days[0]?.events).toEqual([
      {
        source: OTHER,
        status: 'DEGRADED_PERFORMANCE',
        start: NOW - DAY - HOUR,
        end: NOW - DAY + HOUR,
      },
    ]);
    // The two segments of one incident fold into one event spanning both.
    expect(days[1]?.events).toEqual([
      { source: INC, status: 'MAJOR_OUTAGE', start: NOW - 3 * HOUR, end: NOW - HOUR },
      { source: MAINT, status: 'UNDER_MAINTENANCE', start: NOW - HOUR, end: NOW },
    ]);
    expect(days[1]?.status).toBe('MAJOR_OUTAGE');
  });

  it('a clean day has no events', () => {
    expect(dailyStatuses([], NOW, 'UTC', 1)[0]?.events).toEqual([]);
  });

  it('buckets by the reader’s zone, not UTC', () => {
    // 23:30 UTC on the 2nd is 08:30 on the 3rd in Tokyo.
    const at = Date.UTC(2026, 8, 2, 23, 30);
    const interval = [between(at, at + 10 * 60 * 1000, 'MAJOR_OUTAGE')];
    expect(dailyStatuses(interval, NOW, 'UTC', 2).map((day) => day.status)).toEqual([
      'MAJOR_OUTAGE',
      'OPERATIONAL',
    ]);
    expect(dailyStatuses(interval, NOW, 'Asia/Tokyo', 2).map((day) => day.status)).toEqual([
      'OPERATIONAL',
      'MAJOR_OUTAGE',
    ]);
  });
});

describe('historyIntervals', () => {
  it('reads an incident off its update snapshots, per component', () => {
    const start = NOW - 3 * HOUR;
    const map = historyIntervals(
      {
        incidents: [
          {
            id: 'inc_1',
            title: 'API errors',
            href: '/incidents/inc_1',
            startTime: start,
            resolveTime: NOW - HOUR,
            components: [{ componentId: 'api' }],
            updates: [
              {
                createTime: start,
                components: [
                  { componentId: 'api', status: 'PARTIAL_OUTAGE' },
                  { componentId: 'cdn', status: 'DEGRADED_PERFORMANCE' },
                ],
              },
              {
                createTime: NOW - 2 * HOUR,
                components: [
                  { componentId: 'api', status: 'MAJOR_OUTAGE' },
                  { componentId: 'cdn', status: 'OPERATIONAL' },
                ],
              },
              {
                createTime: NOW - HOUR,
                components: [
                  { componentId: 'api', status: 'OPERATIONAL' },
                  { componentId: 'cdn', status: 'OPERATIONAL' },
                ],
              },
            ],
          },
        ],
        maintenances: [],
      },
      NOW,
    );
    expect(map.get('api')).toEqual([
      { start, end: NOW - 2 * HOUR, status: 'PARTIAL_OUTAGE', source: INC },
      { start: NOW - 2 * HOUR, end: NOW - HOUR, status: 'MAJOR_OUTAGE', source: INC },
    ]);
    expect(map.get('cdn')).toEqual([
      { start, end: NOW - 2 * HOUR, status: 'DEGRADED_PERFORMANCE', source: INC },
    ]);
  });

  it('runs an open incident to now', () => {
    const start = NOW - HOUR;
    const map = historyIntervals(
      {
        incidents: [
          {
            id: 'inc_2',
            title: 'CDN slow',
            startTime: start,
            resolveTime: null,
            components: [{ componentId: 'api' }],
            updates: [
              { createTime: start, components: [{ componentId: 'api', status: 'MAJOR_OUTAGE' }] },
            ],
          },
        ],
        maintenances: [],
      },
      NOW,
    );
    expect(map.get('api')).toEqual([{ start, end: NOW, status: 'MAJOR_OUTAGE', source: OTHER }]);
  });

  it('pairs a maintenance start with the entry that ended it, or with now', () => {
    const map = historyIntervals(
      {
        incidents: [],
        maintenances: [
          {
            id: 'mnt_1',
            title: 'DB upgrade',
            components: [{ componentId: 'db' }],
            updates: [
              { createTime: NOW - 5 * HOUR, status: 'SCHEDULED' },
              { createTime: NOW - 4 * HOUR, status: 'IN_PROGRESS' },
              { createTime: NOW - 3 * HOUR, status: 'COMPLETED' },
            ],
          },
          {
            id: 'mnt_2',
            title: 'Cache flush',
            components: [{ componentId: 'cache' }],
            updates: [{ createTime: NOW - HOUR, status: 'IN_PROGRESS' }],
          },
        ],
      },
      NOW,
    );
    expect(map.get('db')).toEqual([
      { start: NOW - 4 * HOUR, end: NOW - 3 * HOUR, status: 'UNDER_MAINTENANCE', source: MAINT },
    ]);
    expect(map.get('cache')).toEqual([
      {
        start: NOW - HOUR,
        end: NOW,
        status: 'UNDER_MAINTENANCE',
        source: { kind: 'maintenance', id: 'mnt_2', title: 'Cache flush' },
      },
    ]);
  });
});
