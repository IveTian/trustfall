import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

const styles = stylex.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: shadow.raised,
    padding: space[5],
  },
});

export function Card({ children, as: Tag = 'div' }: { children: ReactNode; as?: 'div' | 'section' | 'li' | 'article' }) {
  return <Tag {...stylex.props(styles.card)}>{children}</Tag>;
}
