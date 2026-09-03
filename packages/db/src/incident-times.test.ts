import { describe, expect, it } from 'vitest';
import { incidentTimesForUpdate } from './incident-times.ts';

describe('incidentTimesForUpdate', () => {
  it('keeps the start when the update is later', () => {
    expect(incidentTimesForUpdate({ startTime: 100, resolveTime: null }, 250, false)).toEqual({
      startTime: 100,
      resolveTime: null,
    });
  });

  it('moves the start to an earlier update', () => {
    expect(incidentTimesForUpdate({ startTime: 100, resolveTime: null }, 40, false)).toEqual({
      startTime: 40,
      resolveTime: null,
    });
  });

  it('stamps resolve at the update time', () => {
    expect(incidentTimesForUpdate({ startTime: 100, resolveTime: null }, 250, true)).toEqual({
      startTime: 100,
      resolveTime: 250,
    });
  });

  it('moves start and resolve together when a resolve is the earliest time', () => {
    expect(incidentTimesForUpdate({ startTime: 100, resolveTime: 300 }, 40, true)).toEqual({
      startTime: 40,
      resolveTime: 40,
    });
  });
});
