import { describe, expect, it } from 'vitest';
import {
  clampPageSize,
  decodeCursor,
  decodeKeyset,
  decodeOffset,
  encodeKeyset,
  encodeOffset,
  MAX_PAGE_SIZE,
  takePage,
} from './pagination.ts';

describe('clampPageSize', () => {
  it('defaults when absent', () => {
    expect(clampPageSize()).toBe(25);
  });

  it('clamps to the allowed range', () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-5)).toBe(1);
    expect(clampPageSize(1000)).toBe(MAX_PAGE_SIZE);
  });
});

describe('cursors', () => {
  it('round-trips an offset', () => {
    expect(decodeOffset(encodeOffset(50))).toBe(50);
  });

  it('round-trips a keyset', () => {
    expect(decodeKeyset(encodeKeyset(1735689600000, 'acl_x'))).toEqual([1735689600000, 'acl_x']);
  });

  it('reads legacy offset tokens', () => {
    // Tokens issued before keyset paging existed.
    expect(decodeOffset(btoa(JSON.stringify({ o: 42 })))).toBe(42);
  });

  it('does not read an offset token as a keyset', () => {
    // Misreading one encoding as the other would silently return a wrong page.
    expect(decodeKeyset(encodeOffset(42))).toBeUndefined();
  });

  it('does not read a keyset token as an offset', () => {
    expect(decodeOffset(encodeKeyset(1, 'a'))).toBe(0);
  });

  it.each([
    ['absent', undefined],
    ['not base64', '!!!!'],
    ['not json', btoa('nonsense')],
    ['null', btoa('null')],
    ['wrong offset type', btoa(JSON.stringify({ o: 'x' }))],
    ['negative offset', btoa(JSON.stringify({ o: -1 }))],
    ['fractional offset', btoa(JSON.stringify({ o: 1.5 }))],
    ['short keyset', btoa(JSON.stringify({ k: [1] }))],
    ['wrong keyset types', btoa(JSON.stringify({ k: ['a', 1] }))],
    ['unknown shape', btoa(JSON.stringify({ z: 1 }))],
  ])('rejects a %s token', (_label, token) => {
    expect(decodeCursor(token)).toBeUndefined();
    // A bad token must degrade to the first page, never throw at the caller.
    expect(decodeOffset(token)).toBe(0);
    expect(decodeKeyset(token)).toBeUndefined();
  });
});

describe('takePage', () => {
  const cursor = (n: number) => `after-${n}`;

  it('returns every row and no cursor when the probe row is absent', () => {
    expect(takePage([1, 2, 3], 5, cursor)).toEqual({ items: [1, 2, 3], nextCursor: undefined });
  });

  it('drops the probe row and emits a cursor when there is more', () => {
    expect(takePage([1, 2, 3, 4], 3, cursor)).toEqual({
      items: [1, 2, 3],
      nextCursor: 'after-3',
    });
  });

  it('emits no cursor for an exactly-full final page', () => {
    expect(takePage([1, 2, 3], 3, cursor)).toEqual({ items: [1, 2, 3], nextCursor: undefined });
  });

  it('handles an empty result', () => {
    expect(takePage([], 10, cursor)).toEqual({ items: [], nextCursor: undefined });
  });

  it('does not mutate the input', () => {
    const rows = [1, 2, 3, 4];
    takePage(rows, 2, cursor);
    expect(rows).toEqual([1, 2, 3, 4]);
  });
});
