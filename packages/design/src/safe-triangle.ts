/**
 * Hover intent for menus whose submenu opens to the side — the "safe triangle".
 *
 * A submenu that opens on hover sits at the parent menu's inline end, so the
 * pointer travelling to it cuts diagonally across the rows in between. A menu
 * that dismisses the submenu the moment another row is hovered makes that
 * diagonal impossible: the submenu vanishes mid-travel and the person has to
 * trace an L along the row and then down. The fix is to read direction, not
 * position. While the pointer stays inside the triangle whose apex is where it
 * left the parent row and whose base is the submenu's near edge, it is still
 * aiming at the submenu, and the dismissal waits.
 *
 * The triangle only widens toward the submenu, so a pointer that leaves the row
 * heading down the menu — the one case that really is a different row — falls
 * out of it immediately and the submenu closes with no delay at all.
 *
 * Pure geometry, in viewport coordinates: the caller owns the DOM.
 */

export type Point = { x: number; y: number };

/** The parts of a `DOMRect` the triangle needs. */
export type Bounds = { left: number; right: number; top: number; bottom: number };

/**
 * How long the pointer may sit still inside the triangle before the submenu
 * stops waiting for it. Aiming is a movement; a pointer parked over another row
 * has stopped aiming, whatever the geometry says.
 */
export const SAFE_TRIANGLE_GRACE_MS = 300;

/** Twice the signed area of `abc`: positive, negative, or zero when collinear. */
function cross(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/**
 * Is `pointer` inside the triangle spanned by `origin` and the near edge of
 * `submenu` — the edge facing the parent menu, which is the right edge under
 * RTL. Points on the boundary count as inside, and so does `origin` itself.
 */
export function aimsAtSubmenu(
  origin: Point,
  pointer: Point,
  submenu: Bounds,
  rtl: boolean,
): boolean {
  const x = rtl ? submenu.right : submenu.left;
  const near: Point = { x, y: submenu.top };
  const far: Point = { x, y: submenu.bottom };
  const sides = [
    cross(origin, near, pointer),
    cross(near, far, pointer),
    cross(far, origin, pointer),
  ];
  // One consistent orientation means inside; a mixed sign means the point is on
  // the outer side of one edge. Zeroes are boundary hits and match either way,
  // which also covers a degenerate (zero-height) submenu rect.
  return !(sides.some((side) => side < 0) && sides.some((side) => side > 0));
}
