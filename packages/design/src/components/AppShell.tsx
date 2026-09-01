import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control, mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

/**
 * Full-viewport console shell: a canvas-gray backdrop, a chrome-free sidebar
 * rail sitting directly on it, and one white work panel that the canvas
 * surrounds on all four sides. Depth is the surround plus a hairline; the
 * shadow is there only so the edge does not disappear in dark mode.
 *
 * The shell never scrolls. Scrolling happens inside the panel, which is why a
 * `PageHeader` can stick to its top while content passes underneath.
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
      <main {...stylex.props(styles.panel)}>
        <div {...stylex.props(styles.scroll)}>
          <div
            {...content}
            style={{
              ...(typeof content.style === 'object' ? content.style : undefined),
              maxWidth: contentMaxWidth,
            }}
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = stylex.create({
  shell: {
    backgroundColor: color.shell,
    boxSizing: 'border-box',
    display: 'flex',
    gap: space[2],
    height: '100dvh',
    padding: space[2],
  },
  sidebar: {
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    // No block padding of its own: the rail's first and last items line up with
    // the top and bottom edges of the panel beside them.
    paddingBlock: space[0],
    paddingInline: space[2],
    width: control.sidebarWidth,
  },
  panel: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.subtle,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    // Clips the sticky header's hairline to the panel's rounded corners.
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
  },
  content: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    marginInline: 'auto',
    minHeight: '100%',
    width: '100%',
  },
});
