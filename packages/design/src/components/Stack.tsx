import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { space } from '../tokens/space.stylex.ts';

const styles = stylex.create({
  stack: {
    display: 'flex',
  },
  vertical: {
    flexDirection: 'column',
  },
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap0: { gap: space[0] },
  gap1: { gap: space[1] },
  gap2: { gap: space[2] },
  gap3: { gap: space[3] },
  gap4: { gap: space[4] },
  gap5: { gap: space[5] },
  gap6: { gap: space[6] },
});

type Gap = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function Stack({
  children,
  gap = 4,
  direction = 'vertical',
  as: Tag = 'div',
}: {
  children: ReactNode;
  gap?: Gap;
  direction?: 'vertical' | 'horizontal';
  as?: 'div' | 'section' | 'ul' | 'ol' | 'nav' | 'header' | 'footer' | 'form';
}) {
  const gapStyle =
    gap === 0
      ? styles.gap0
      : gap === 1
      ? styles.gap1
      : gap === 2
        ? styles.gap2
        : gap === 3
          ? styles.gap3
          : gap === 5
            ? styles.gap5
            : gap === 6
              ? styles.gap6
              : styles.gap4;

  return (
    <Tag
      {...stylex.props(
        styles.stack,
        direction === 'horizontal' ? styles.horizontal : styles.vertical,
        gapStyle,
      )}
    >
      {children}
    </Tag>
  );
}
