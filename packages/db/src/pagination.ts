/**
 * Page cursors.
 *
 * Offset paging is fine for small, rarely-written collections (component
 * groups, components). It is wrong for append-heavy ones — activity logs, audit
 * entries, webhook deliveries — where a row inserted between two page fetches
 * shifts every later row and the reader silently skips or repeats one.
 *
 * Both encodings share a token shape so the choice stays server-side and
 * clients keep passing an opaque string.
 */
export type PageCursor =
  /** Offset paging. */
  | { o: number }
  /** Keyset paging: [sortValue, tiebreakId] of the last row on the page. */
  | { k: [number, string] };

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function clampPageSize(pageSize?: number): number {
  return Math.min(Math.max(pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
}

export function encodeCursor(cursor: PageCursor): string {
  return btoa(JSON.stringify(cursor));
}

/** Returns undefined for absent, malformed, or wrongly-shaped cursors. */
export function decodeCursor(token: string | undefined): PageCursor | undefined {
  if (!token) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(atob(token));
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }
    if ('o' in parsed) {
      const offset = (parsed as { o: unknown }).o;
      return typeof offset === 'number' && Number.isInteger(offset) && offset >= 0
        ? { o: offset }
        : undefined;
    }
    if ('k' in parsed) {
      const key = (parsed as { k: unknown }).k;
      if (
        Array.isArray(key) &&
        key.length === 2 &&
        typeof key[0] === 'number' &&
        typeof key[1] === 'string'
      ) {
        return { k: [key[0], key[1]] };
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Offset paging. Reads a cursor of either encoding but only emits offsets. */
export function decodeOffset(token: string | undefined): number {
  const cursor = decodeCursor(token);
  return cursor && 'o' in cursor ? cursor.o : 0;
}

export function encodeOffset(offset: number): string {
  return encodeCursor({ o: offset });
}

/** Keyset paging. Ignores offset cursors rather than misreading them as keys. */
export function decodeKeyset(token: string | undefined): [number, string] | undefined {
  const cursor = decodeCursor(token);
  return cursor && 'k' in cursor ? cursor.k : undefined;
}

export function encodeKeyset(sortValue: number, id: string): string {
  return encodeCursor({ k: [sortValue, id] });
}

/**
 * Slices a page out of rows fetched with `limit = pageSize + 1`. The extra row
 * is the "is there more" probe and never reaches the caller.
 */
export function takePage<T>(
  rows: readonly T[],
  pageSize: number,
  nextCursor: (last: T) => string,
): { items: T[]; nextCursor?: string } {
  const hasMore = rows.length > pageSize;
  const items = (hasMore ? rows.slice(0, pageSize) : rows.slice()) as T[];
  const last = items[items.length - 1];
  return {
    items,
    nextCursor: hasMore && last !== undefined ? nextCursor(last) : undefined,
  };
}
