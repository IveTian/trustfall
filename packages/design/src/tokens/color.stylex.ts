import * as stylex from '@stylexjs/stylex';

/**
 * Inlined with defineConsts. StyleX defineVars splits `light-dark(a, b)` into
 * a space-separated pair, which is not a valid `<color>` when used as
 * `background-color: var(--token)`.
 */
export const color = stylex.defineConsts({
  surface: 'light-dark(#EFEFEF, #141414)',
  sidebar: 'light-dark(#FFFFFF, #181818)',
  surfaceRaised: 'light-dark(#FFFFFF, #1A1A1A)',
  surfaceSubtle: 'light-dark(#F6F6F6, #1F1F1F)',
  surfaceSunken: 'light-dark(#EEEEEE, #242424)',
  border: 'light-dark(#E2E2E2, #2E2E2E)',
  borderGrid: 'light-dark(#DCDCDC, #333333)',
  borderStrong: 'light-dark(#AFAFAF, #545454)',
  textPrimary: 'light-dark(#141414, #EFEFEF)',
  textMuted: 'light-dark(#6B6B6B, #AFAFAF)',
  textInverse: 'light-dark(#FFFFFF, #141414)',
  accent: 'light-dark(#5F7EEC, #8CA3F2)',
  accentHover: 'light-dark(#4763CE, #5F7EEC)',
  accentActive: 'light-dark(#384EA6, #4763CE)',
  accentMuted: 'light-dark(#EFF2FD, #1B2248)',
  focus: 'light-dark(#5F7EEC, #8CA3F2)',
  operational: 'light-dark(#03703C, #5DCAA0)',
  operationalMuted: 'light-dark(#E6F2ED, #143226)',
  degraded: 'light-dark(#996F00, #E3B341)',
  degradedMuted: 'light-dark(#FFFAF0, #3A2C0A)',
  partialOutage: 'light-dark(#E11900, #F97066)',
  partialOutageMuted: 'light-dark(#FFEFED, #3A1412)',
  majorOutage: 'light-dark(#AB1300, #FF8A80)',
  majorOutageMuted: 'light-dark(#FFEFED, #3B0E16)',
  maintenance: 'light-dark(#5F7EEC, #8CA3F2)',
  maintenanceMuted: 'light-dark(#EFF2FD, #1B2248)',
  scrim: 'light-dark(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65))',
});
