import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

/**
 * Full-viewport console shell: canvas-gray backdrop, floating white sidebar,
 * scrollable content column. The shell itself never scrolls.
 */
export function AppShell({
  sidebar,
  children,
  contentMaxWidth = 'none',
}: {
  sidebar: ReactNode;
  children: ReactNode;
  contentMaxWidth?: string;
}) {
  const content = stylex.props(styles.content);
  return (
    <div {...stylex.props(styles.shell)}>
      <aside {...stylex.props(styles.sidebar)}>{sidebar}</aside>
      <main {...stylex.props(styles.main)}>
        <div
          {...content}
          style={{
            ...(typeof content.style === 'object' ? content.style : undefined),
            maxWidth: contentMaxWidth,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

const styles = stylex.create({
  shell: {
    backgroundColor: color.surface,
    boxSizing: 'border-box',
    display: 'flex',
    gap: space[2],
    height: '100dvh',
    padding: space[2],
  },
  sidebar: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.sm,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    padding: space[4],
    width: control.sidebarWidth,
  },
  main: {
    flexGrow: 1,
    minWidth: 0,
    overflowY: 'auto',
  },
  content: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    marginInline: 'auto',
    minHeight: '100%',
    paddingBlockStart: space[5],
    paddingInline: space.gutter,
    width: '100%',
  },
});
