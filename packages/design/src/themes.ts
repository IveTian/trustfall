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
  prose: '40rem',
});

export const compactText = stylex.createTheme(text, {
  sizeCaption: '0.75rem',
  sizeBody: '0.875rem',
  sizeTitle: '1.0625rem',
  sizeDisplay: '1.5rem',
  lineCaption: '1.125rem',
  lineBody: '1.25rem',
  lineTitle: '1.5rem',
  lineDisplay: '1.75rem',
});
