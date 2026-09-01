import type { Context } from 'hono';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors.ts';
import { checkIfMatch, createdLocation, etagFor } from './http.ts';

function context(options: { url?: string; ifMatch?: string }): Context {
  return {
    req: {
      url: options.url ?? 'https://status.example.com/api/components',
      header: (name: string) => (name === 'if-match' ? options.ifMatch : undefined),
    },
  } as unknown as Context;
}

function catchError(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('etagFor', () => {
  it('quotes the tag so it is a strong validator', () => {
    // If-Match compares strongly; a weak tag would never match and every
    // conditional write would fail.
    expect(etagFor(1735689600000)).toMatch(/^"[a-z0-9]+"$/);
  });

  it('changes whenever the row does', () => {
    expect(etagFor(1735689600000)).not.toBe(etagFor(1735689600001));
  });
});

describe('checkIfMatch', () => {
  const current = etagFor(1735689600000);

  it('allows a write that sends no precondition', () => {
    expect(() => checkIfMatch(context({}), current)).not.toThrow();
  });

  it('allows a matching tag', () => {
    expect(() => checkIfMatch(context({ ifMatch: current }), current)).not.toThrow();
  });

  it('allows a list containing the tag', () => {
    expect(() => checkIfMatch(context({ ifMatch: `"stale", ${current}` }), current)).not.toThrow();
  });

  it('allows the wildcard, which only asserts the resource exists', () => {
    expect(() => checkIfMatch(context({ ifMatch: '*' }), current)).not.toThrow();
  });

  it('refuses a stale tag instead of overwriting a newer edit', () => {
    const thrown = catchError(() => checkIfMatch(context({ ifMatch: etagFor(1) }), current));
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).httpStatus).toBe(412);
  });
});

describe('createdLocation', () => {
  it('addresses the new resource under the collection', () => {
    expect(createdLocation(context({}), 'cmp_1')).toBe('/api/components/cmp_1');
  });

  it('does not double the slash on a trailing-slash collection', () => {
    expect(
      createdLocation(context({ url: 'https://status.example.com/api/components/' }), 'cmp_1'),
    ).toBe('/api/components/cmp_1');
  });

  it('escapes an id that would otherwise change the path', () => {
    expect(createdLocation(context({}), 'a/b')).toBe('/api/components/a%2Fb');
  });
});
