import * as stylex from '@stylexjs/stylex';
import { space } from './tokens/space.stylex.ts';
import { text } from './tokens/text.stylex.ts';

export const compactSpace = stylex.createTheme(space, {
  1: '2px',
  2: '6px',
  3: '8px',
  4: '12px',
  5: '16px',
  6: '24px',
  7: '32px',
  8: '48px',
  page: '20px',
  gutter: '16px',
  prose: '40rem',
});

export const compactText = stylex.createTheme(text, {
  sizeCaption: '12px',
  sizeBodySmall: '13px',
  sizeBody: '14px',
  sizeTitle: '16px',
  sizeDisplay: '20px',
  lineCaption: '16px',
  lineBodySmall: '18px',
  lineBody: '20px',
  lineTitle: '22px',
  lineDisplay: '28px',
});
