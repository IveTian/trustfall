import { describe, expect, it } from 'vitest';
import { aimsAtSubmenu, type Bounds, type Point } from './safe-triangle.ts';

/**
 * A menu panel spanning x 0–280 with its Appearance row at y 100–140, and the
 * submenu hung off its inline end. `origin` is where the pointer left the row.
 */
const submenu: Bounds = { left: 284, right: 440, top: 100, bottom: 220 };
const origin: Point = { x: 140, y: 120 };

/** The same layout mirrored: the submenu opens to the inline end under RTL too. */
const rtlSubmenu: Bounds = { left: 40, right: 196, top: 100, bottom: 220 };
const rtlOrigin: Point = { x: 240, y: 120 };

describe('aimsAtSubmenu', () => {
  it('holds the submenu for a diagonal cutting across the rows below', () => {
    expect(aimsAtSubmenu(origin, { x: 200, y: 150 }, submenu, false)).toBe(true);
    expect(aimsAtSubmenu(origin, { x: 260, y: 200 }, submenu, false)).toBe(true);
  });

  it('holds it for a straight run along the row toward the edge', () => {
    expect(aimsAtSubmenu(origin, { x: 270, y: 120 }, submenu, false)).toBe(true);
  });

  it('releases it for a walk down the menu to another row', () => {
    expect(aimsAtSubmenu(origin, { x: 140, y: 200 }, submenu, false)).toBe(false);
    expect(aimsAtSubmenu(origin, { x: 60, y: 170 }, submenu, false)).toBe(false);
  });

  it('releases it for a pointer heading away from the submenu', () => {
    expect(aimsAtSubmenu(origin, { x: 100, y: 130 }, submenu, false)).toBe(false);
  });

  it('releases it past the submenu, above it, and below it', () => {
    expect(aimsAtSubmenu(origin, { x: 300, y: 150 }, submenu, false)).toBe(false);
    expect(aimsAtSubmenu(origin, { x: 260, y: 60 }, submenu, false)).toBe(false);
    expect(aimsAtSubmenu(origin, { x: 260, y: 300 }, submenu, false)).toBe(false);
  });

  it('counts the apex and the edge itself as inside', () => {
    expect(aimsAtSubmenu(origin, origin, submenu, false)).toBe(true);
    expect(aimsAtSubmenu(origin, { x: 284, y: 100 }, submenu, false)).toBe(true);
    expect(aimsAtSubmenu(origin, { x: 284, y: 220 }, submenu, false)).toBe(true);
  });

  it('mirrors under RTL', () => {
    expect(aimsAtSubmenu(rtlOrigin, { x: 210, y: 150 }, rtlSubmenu, true)).toBe(true);
    expect(aimsAtSubmenu(rtlOrigin, { x: 180, y: 150 }, rtlSubmenu, true)).toBe(false);
    expect(aimsAtSubmenu(rtlOrigin, { x: 240, y: 200 }, rtlSubmenu, true)).toBe(false);
    expect(aimsAtSubmenu(rtlOrigin, { x: 280, y: 130 }, rtlSubmenu, true)).toBe(false);
  });

  it('reads the near edge, not the far one', () => {
    // A pointer level with the row but beyond the far edge is outside, even
    // though it sits between the two edges' y range.
    expect(aimsAtSubmenu(origin, { x: 500, y: 120 }, submenu, false)).toBe(false);
  });
});
