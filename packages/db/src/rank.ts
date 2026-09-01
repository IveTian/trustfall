/**
 * Lexicographic ranks for user-ordered lists.
 *
 * Severities, incident statuses, roles, custom fields and follow-up priorities
 * are all reorderable. Integer positions force a rewrite of every row after the
 * insertion point; a string rank that sorts between its neighbours needs one.
 *
 * Ranks are compared as plain strings, so `ORDER BY rank` is an index scan.
 */

const MIN_CHAR = 32; // space
const MAX_CHAR = 126; // ~
const MID_CHAR = Math.floor((MIN_CHAR + MAX_CHAR) / 2);

/**
 * Returns a rank ordering strictly between `before` and `after`.
 *
 * Pass undefined for either end: `between(undefined, first)` prepends,
 * `between(last, undefined)` appends, `between(undefined, undefined)` seeds an
 * empty list.
 *
 * Throws if `before >= after`, which would mean the caller's neighbours are not
 * actually adjacent in rank order.
 */
export function between(before?: string, after?: string): string {
  if (before !== undefined && after !== undefined && before >= after) {
    throw new Error(`Cannot rank between ${JSON.stringify(before)} and ${JSON.stringify(after)}.`);
  }

  const lower = before ?? '';
  const upper = after;

  let rank = '';
  for (let i = 0; ; i += 1) {
    const lowerCode = i < lower.length ? lower.charCodeAt(i) : MIN_CHAR - 1;
    const upperCode = upper !== undefined && i < upper.length ? upper.charCodeAt(i) : MAX_CHAR + 1;

    if (lowerCode + 1 < upperCode) {
      // Room to land between the two characters at this position.
      const mid =
        upper === undefined ? nextAfter(lowerCode) : Math.floor((lowerCode + upperCode) / 2);
      return rank + String.fromCharCode(mid);
    }

    // Characters are equal or adjacent: keep the prefix and look one deeper.
    rank += String.fromCharCode(Math.max(lowerCode, MIN_CHAR));
  }
}

/**
 * Appending grows the rank towards MAX_CHAR without ever reaching it, so a
 * later append always has room.
 */
function nextAfter(lowerCode: number): number {
  if (lowerCode < MIN_CHAR) {
    return MID_CHAR;
  }
  return Math.floor((lowerCode + MAX_CHAR + 1) / 2);
}

/** Ranks a fresh list in order, e.g. when seeding defaults. */
export function initialRanks(count: number): string[] {
  const ranks: string[] = [];
  let previous: string | undefined;
  for (let i = 0; i < count; i += 1) {
    previous = between(previous, undefined);
    ranks.push(previous);
  }
  return ranks;
}
