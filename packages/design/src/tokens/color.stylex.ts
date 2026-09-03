import * as stylex from '@stylexjs/stylex';

/**
 * Inlined with defineConsts. StyleX defineVars splits `light-dark(a, b)` into
 * a space-separated pair, which is not a valid `<color>` when used as
 * `background-color: var(--token)`.
 */
export const color = stylex.defineConsts({
  surface: 'light-dark(#EFEFEF, #141414)',
  // Console canvas: the rail and the margin the white panel floats in. Warmer
  // and lighter than the mesh canvas, so the panel still reads as lifted.
  shell: 'light-dark(#F5F5F3, #141414)',
  shellHover: 'light-dark(#EBEAE6, #1F1F1F)',
  surfaceRaised: 'light-dark(#FFFFFF, #1A1A1A)',
  surfaceSubtle: 'light-dark(#F6F6F6, #1F1F1F)',
  surfaceSunken: 'light-dark(#EEEEEE, #242424)',
  border: 'light-dark(#E2E2E2, #2E2E2E)',
  borderGrid: 'light-dark(#DCDCDC, #333333)',
  borderStrong: 'light-dark(#AFAFAF, #545454)',
  textPrimary: 'light-dark(#141414, #EFEFEF)',
  textMuted: 'light-dark(#6B6B6B, #AFAFAF)',
  textInverse: 'light-dark(#FFFFFF, #141414)',
  // Rail type: quiet until it is where you are.
  navText: 'light-dark(#575551, #A8A29E)',
  navTextActive: 'light-dark(#1B1917, #F5F5F3)',
  // The console's one dark mass: primary buttons and the mark chip. Saturated
  // accent is reserved for links, focus, and maintenance status.
  solid: 'light-dark(#1C1C1C, #EFEFEF)',
  solidHover: 'light-dark(#333333, #FFFFFF)',
  solidActive: 'light-dark(#000000, #D2D2D2)',
  accent: 'light-dark(#5F7EEC, #8CA3F2)',
  accentHover: 'light-dark(#4763CE, #5F7EEC)',
  accentActive: 'light-dark(#384EA6, #4763CE)',
  accentMuted: 'light-dark(#EFF2FD, #1B2248)',
  focus: 'light-dark(#5F7EEC, #8CA3F2)',
  // Status hues: green, yellow, orange, red — one hue apart, so the scale
  // reads at a glance; light values clear 3:1 on white for the marks.
  operational: 'light-dark(#16A34A, #4ADE80)',
  operationalMuted: 'light-dark(#E7F6EC, #14301F)',
  degraded: 'light-dark(#C28A00, #FACC15)',
  degradedMuted: 'light-dark(#FFF7DB, #3A2E0A)',
  partialOutage: 'light-dark(#EA580C, #FB923C)',
  partialOutageMuted: 'light-dark(#FFF0E6, #3B1F0E)',
  majorOutage: 'light-dark(#DC2626, #F87171)',
  majorOutageMuted: 'light-dark(#FEECEC, #3B1414)',
  maintenance: 'light-dark(#5F7EEC, #8CA3F2)',
  maintenanceMuted: 'light-dark(#EFF2FD, #1B2248)',
  scrim: 'light-dark(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65))',
});
