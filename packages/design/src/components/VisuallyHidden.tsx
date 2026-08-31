import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';

const styles = stylex.create({
  root: {
    borderWidth: 0,
    clipPath: 'inset(50%)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
});

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span {...stylex.props(styles.root)}>{children}</span>;
}
