import { describe, expect, it } from 'vitest';
import { between, initialRanks } from './rank.ts';

describe('between', () => {
  it('seeds an empty list', () => {
    expect(between(undefined, undefined)).toBeTruthy();
  });

  it('appends after a rank', () => {
    const first = between(undefined, undefined);
    const second = between(first, undefined);
    expect(second > first).toBe(true);
  });

  it('prepends before a rank', () => {
    const first = between(undefined, undefined);
    const zeroth = between(undefined, first);
    expect(zeroth < first).toBe(true);
  });

  it('lands strictly between two neighbours', () => {
    const a = between(undefined, undefined);
    const b = between(a, undefined);
    const mid = between(a, b);
    expect(a < mid).toBe(true);
    expect(mid < b).toBe(true);
  });

  it('keeps finding room between ever-closer neighbours', () => {
    // Repeatedly inserting at the same spot is the case that breaks naive
    // integer or single-character schemes.
    let low = between(undefined, undefined);
    const high = between(low, undefined);
    let previous = low;
    for (let i = 0; i < 200; i += 1) {
      const next = between(low, high);
      expect(low < next).toBe(true);
      expect(next < high).toBe(true);
      expect(next).not.toBe(previous);
      previous = next;
      low = next;
    }
  });

  it('rejects neighbours that are not in order', () => {
    const a = between(undefined, undefined);
    const b = between(a, undefined);
    expect(() => between(b, a)).toThrow(/Cannot rank between/);
  });

  it('rejects identical neighbours', () => {
    const a = between(undefined, undefined);
    expect(() => between(a, a)).toThrow(/Cannot rank between/);
  });

  it('never produces a rank containing characters outside the printable range', () => {
    let rank: string | undefined;
    for (let i = 0; i < 50; i += 1) {
      rank = between(rank, undefined);
      for (const char of rank) {
        const code = char.charCodeAt(0);
        expect(code).toBeGreaterThanOrEqual(32);
        expect(code).toBeLessThanOrEqual(126);
      }
    }
  });
});

describe('initialRanks', () => {
  it('returns an ascending, unique sequence', () => {
    const ranks = initialRanks(12);
    expect(ranks).toHaveLength(12);
    expect(new Set(ranks).size).toBe(12);
    expect([...ranks].sort()).toEqual(ranks);
  });

  it('returns nothing for an empty list', () => {
    expect(initialRanks(0)).toEqual([]);
  });
});
