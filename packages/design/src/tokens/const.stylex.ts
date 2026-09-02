import * as stylex from '@stylexjs/stylex';

export const motion = stylex.defineConsts({
  fast: '120ms',
  base: '200ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
});

export const breakpoints = stylex.defineConsts({
  sm: '@media (min-width: 640px)',
  md: '@media (min-width: 880px)',
  reduceMotion: '@media (prefers-reduced-motion: reduce)',
});

export const zIndex = stylex.defineConsts({
  header: '10',
  menu: '30',
  toast: '40',
  dialog: '50',
});

export const control = stylex.defineConsts({
  focusWidth: '2px',
  focusOffset: '2px',
  heightSm: '28px',
  heightMd: '32px',
  heightLg: '40px',
  sidebarWidth: '240px',
  menuMaxWidth: '280px',
  headerHeight: '52px',
  markSize: '28px',
  contentWidth: '880px',
  contentWidthWide: '1320px',
});

export const mesh = stylex.defineConsts({
  cell: '96px',
  line: '1px',
});
