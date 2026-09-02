import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { space } from '../tokens/space.stylex.ts';

// The sandwich needs real room for three columns; below this the panes stack.
// A container query, not a viewport one: the layout answers to the column it
// lives in, so a narrow host (a gallery, a split view) stacks even on a wide
// screen.
const wideEnough = '@container (min-width: 56rem)';

/**
 * The dashboard sandwich: a narrow nav on the start edge, the reading column
 * in the middle, a rail of live state on the end edge. In a narrow container
 * the three stack in reading order — nav, content, rail.
 */
export function PageColumns({
  nav,
  aside,
  children,
}: {
  nav: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.host)}>
      <div {...stylex.props(styles.columns)}>
        <div {...stylex.props(styles.nav)}>{nav}</div>
        <div {...stylex.props(styles.content)}>{children}</div>
        <aside {...stylex.props(styles.aside)}>{aside}</aside>
      </div>
    </div>
  );
}

const styles = stylex.create({
  host: {
    containerType: 'inline-size',
  },
  columns: {
    alignItems: 'start',
    display: 'grid',
    gap: space[5],
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      [wideEnough]: '200px minmax(0, 1fr) 300px',
    },
  },
  nav: {
    minWidth: 0,
    position: {
      default: 'static',
      [wideEnough]: 'sticky',
    },
    top: space[5],
  },
  content: {
    minWidth: 0,
  },
  aside: {
    minWidth: 0,
    position: {
      default: 'static',
      [wideEnough]: 'sticky',
    },
    top: space[5],
  },
});
