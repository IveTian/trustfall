import * as stylex from '@stylexjs/stylex';

export const shadow = stylex.defineConsts({
  /** Barely there. Separates a white surface from the canvas it sits on. */
  subtle: '0 1px 2px light-dark(rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.35))',
  /** A whisper of lift for hover feedback: visible, never dramatic. */
  hover: '0 2px 8px light-dark(rgb(0 0 0 / 0.07), rgb(0 0 0 / 0.3))',
  raised:
    '0 12px 28px light-dark(rgb(0 0 0 / 0.14), rgb(0 0 0 / 0.4)), 0 2px 8px light-dark(rgb(0 0 0 / 0.08), rgb(0 0 0 / 0.3))',
  overlay: '0 4px 12px light-dark(rgb(0 0 0 / 0.10), rgb(0 0 0 / 0.45))',
});
