import { describe, expect, it } from 'vitest';
import { timeZoneCity, timeZoneLabel } from './time-zone.ts';

describe('timeZoneCity', () => {
  it('reads the last IANA segment and turns underscores into spaces', () => {
    expect(timeZoneCity('Australia/Perth')).toBe('Perth');
    expect(timeZoneCity('America/New_York')).toBe('New York');
    expect(timeZoneCity('America/Indiana/Indianapolis')).toBe('Indianapolis');
  });

  it('keeps UTC as UTC', () => {
    expect(timeZoneCity('UTC')).toBe('UTC');
    expect(timeZoneCity('Etc/UTC')).toBe('UTC');
  });
});

describe('timeZoneLabel', () => {
  it('prints a short GMT offset for Perth', () => {
    // Perth has no DST; the offset is always +8.
    expect(timeZoneLabel('Australia/Perth', Date.UTC(2026, 8, 3, 8, 0))).toBe('GMT+8');
  });
});
