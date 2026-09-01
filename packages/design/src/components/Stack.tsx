import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { space } from '../tokens/space.stylex.ts';

const styles = stylex.create({
  stack: {
    display: 'flex',
    minWidth: 0,
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  gap0: { gap: space[0] },
  gap1: { gap: space[1] },
  gap2: { gap: space[2] },
  gap3: { gap: space[3] },
  gap4: { gap: space[4] },
  gap5: { gap: space[5] },
  gap6: { gap: space[6] },
  justifyStart: { justifyContent: 'flex-start' },
  justifyCenter: { justifyContent: 'center' },
  justifyBetween: { justifyContent: 'space-between' },
  alignStart: { alignItems: 'flex-start' },
  alignCenter: { alignItems: 'center' },
  alignBaseline: { alignItems: 'baseline' },
  grow: {
    flexBasis: 'auto',
    flexGrow: 1,
    flexShrink: 0,
  },
  wrap: {
    flexWrap: 'wrap',
  },
});

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const GAP = {
  0: styles.gap0,
  1: styles.gap1,
  2: styles.gap2,
  3: styles.gap3,
  4: styles.gap4,
  5: styles.gap5,
  6: styles.gap6,
} as const;

export function Stack({
  children,
  gap = 4,
  direction = 'vertical',
  justify = 'start',
  align,
  grow = false,
  wrap = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  gap?: Gap;
  direction?: 'vertical' | 'horizontal';
  justify?: 'start' | 'center' | 'between';
  align?: 'start' | 'center' | 'baseline';
  grow?: boolean;
  wrap?: boolean;
  as?: 'div' | 'section' | 'ul' | 'ol' | 'nav' | 'header' | 'footer' | 'form';
}) {
  const justifyStyle =
    justify === 'center'
      ? styles.justifyCenter
      : justify === 'between'
        ? styles.justifyBetween
        : styles.justifyStart;
  const alignStyle =
    align === 'start'
      ? styles.alignStart
      : align === 'baseline'
        ? styles.alignBaseline
        : align === 'center'
          ? styles.alignCenter
          : null;

  return (
    <Tag
      {...stylex.props(
        styles.stack,
        direction === 'horizontal' ? styles.horizontal : styles.vertical,
        GAP[gap],
        justifyStyle,
        alignStyle,
        grow && styles.grow,
        wrap && styles.wrap,
      )}
    >
      {children}
    </Tag>
  );
}
