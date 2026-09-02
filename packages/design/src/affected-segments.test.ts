import { describe, expect, it } from 'vitest';
import { componentSegments } from './affected-segments.ts';

const MINUTE = 60 * 1000;
const START = Date.UTC(2026, 8, 2, 11, 38);
const LEAD = START - 5 * MINUTE;

describe('componentSegments', () => {
  it('runs operational up to the start, then follows each update', () => {
    const segments = componentSegments(
      'cdn',
      [
        { createTime: START, components: [{ componentId: 'cdn', status: 'PARTIAL_OUTAGE' }] },
        {
          createTime: START + 10 * MINUTE,
          components: [{ componentId: 'cdn', status: 'MAJOR_OUTAGE' }],
        },
        {
          createTime: START + 30 * MINUTE,
          components: [{ componentId: 'cdn', status: 'OPERATIONAL' }],
        },
      ],
      LEAD,
      START,
      START + 40 * MINUTE,
    );
    expect(segments).toEqual([
      { start: LEAD, end: START, status: 'OPERATIONAL' },
      { start: START, end: START + 10 * MINUTE, status: 'PARTIAL_OUTAGE' },
      { start: START + 10 * MINUTE, end: START + 30 * MINUTE, status: 'MAJOR_OUTAGE' },
      { start: START + 30 * MINUTE, end: START + 40 * MINUTE, status: 'OPERATIONAL' },
    ]);
  });

  it('merges neighbouring runs of the same status', () => {
    const segments = componentSegments(
      'api',
      [
        { createTime: START, components: [{ componentId: 'api', status: 'DEGRADED_PERFORMANCE' }] },
        {
          createTime: START + 5 * MINUTE,
          components: [{ componentId: 'api', status: 'DEGRADED_PERFORMANCE' }],
        },
      ],
      LEAD,
      START,
      START + 20 * MINUTE,
    );
    expect(segments).toEqual([
      { start: LEAD, end: START, status: 'OPERATIONAL' },
      { start: START, end: START + 20 * MINUTE, status: 'DEGRADED_PERFORMANCE' },
    ]);
  });

  it('treats a component missing from a snapshot as operational', () => {
    const segments = componentSegments(
      'api',
      [
        { createTime: START, components: [{ componentId: 'api', status: 'PARTIAL_OUTAGE' }] },
        {
          createTime: START + 5 * MINUTE,
          components: [{ componentId: 'cdn', status: 'MAJOR_OUTAGE' }],
        },
      ],
      LEAD,
      START,
      START + 10 * MINUTE,
    );
    expect(segments).toEqual([
      { start: LEAD, end: START, status: 'OPERATIONAL' },
      { start: START, end: START + 5 * MINUTE, status: 'PARTIAL_OUTAGE' },
      { start: START + 5 * MINUTE, end: START + 10 * MINUTE, status: 'OPERATIONAL' },
    ]);
  });

  it('folds updates posted before the start into the opening status', () => {
    const segments = componentSegments(
      'api',
      [
        {
          createTime: START - MINUTE,
          components: [{ componentId: 'api', status: 'MAJOR_OUTAGE' }],
        },
      ],
      LEAD,
      START,
      START + 10 * MINUTE,
    );
    expect(segments).toEqual([
      { start: LEAD, end: START, status: 'OPERATIONAL' },
      { start: START, end: START + 10 * MINUTE, status: 'MAJOR_OUTAGE' },
    ]);
  });
});
