import * as stylex from '@stylexjs/stylex';
import { useState, type AnimationEvent, type ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

/**
 * One rail the shell can show. `depth` orders rails as a stack: moving to a
 * deeper rail pushes the current one out toward the start edge and brings
 * the new one in from the end edge; moving shallower plays the reverse.
 */
export type SidebarRail = { key: string; depth: number; node: ReactNode };

type Leaving = { key: string; direction: 'forward' | 'back' };

/**
 * Full-viewport console shell: a canvas-gray backdrop, a chrome-free sidebar
 * rail sitting directly on it, and one white work panel that the canvas
 * surrounds on all four sides. Depth is the surround plus a hairline; the
 * shadow is there only so the edge does not disappear in dark mode.
 *
 * The shell never scrolls. Scrolling happens inside the panel, which is why a
 * `PageHeader` can stick to its top while content passes underneath.
 *
 * The sidebar is a navigation stack of rails. Hand the shell every rail it
 * may show and name the active one; when that name changes, the shell slides
 * the old rail out and the new rail in, in the direction their depths imply.
 * Only the active rail is mounted outside a transition.
 */
export function AppShell({
  sidebars,
  activeSidebar,
  children,
  contentMaxWidth = 'none',
}: {
  sidebars: SidebarRail[];
  activeSidebar: string;
  children: ReactNode;
  contentMaxWidth?: string;
}) {
  // Detected during render, like Dialog's open flip, so the old rail is still
  // on screen on the very first frame of the new one.
  const [prevActive, setPrevActive] = useState(activeSidebar);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  if (activeSidebar !== prevActive) {
    setPrevActive(activeSidebar);
    const from = sidebars.find((rail) => rail.key === prevActive);
    const to = sidebars.find((rail) => rail.key === activeSidebar);
    if (from && to) {
      setLeaving({ key: from.key, direction: to.depth > from.depth ? 'forward' : 'back' });
    }
  }

  const current = sidebars.find((rail) => rail.key === activeSidebar);
  // A rail the app stopped providing mid-exit simply has nothing left to show.
  const outgoing = leaving ? sidebars.find((rail) => rail.key === leaving.key) : undefined;

  function onLeavingAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    // Children animate too (spinners, skeletons); only the layer's own exit
    // animation may unmount the old rail.
    if (event.target === event.currentTarget) {
      setLeaving(null);
    }
  }

  const content = stylex.props(styles.content);
  return (
    <div {...stylex.props(styles.shell)}>
      <aside {...stylex.props(styles.sidebar)}>
        {leaving && outgoing ? (
          <div
            key={outgoing.key}
            inert
            aria-hidden
            onAnimationEnd={onLeavingAnimationEnd}
            {...stylex.props(
              styles.rail,
              styles.railLeaving,
              leaving.direction === 'forward' ? styles.exitToStart : styles.exitToEnd,
            )}
          >
            {outgoing.node}
          </div>
        ) : null}
        {current ? (
          <div
            key={current.key}
            {...stylex.props(
              styles.rail,
              leaving != null &&
                (leaving.direction === 'forward' ? styles.enterFromEnd : styles.enterFromStart),
            )}
          >
            {current.node}
          </div>
        ) : null}
      </aside>
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
    // The rails slide through here; whatever is past the edge stays unseen.
    overflow: 'hidden',
    position: 'relative',
    width: control.sidebarWidth,
  },
  rail: {
    animationDuration: {
      default: motion.slow,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationFillMode: 'both',
    animationTimingFunction: motion.ease,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    overflowX: 'hidden',
    overflowY: 'auto',
    // No block padding of its own: the rail's first and last items line up with
    // the top and bottom edges of the panel beside them.
    paddingBlock: space[0],
    paddingInline: space[2],
  },
  // The outgoing rail keeps its place on top of the incoming one until its
  // exit finishes; it is inert, so nothing under the pointer can be pressed.
  railLeaving: {
    inset: 0,
    pointerEvents: 'none',
    position: 'absolute',
  },
  enterFromEnd: {
    animationName: stylex.keyframes({
      from: { transform: 'translateX(100%)' },
      to: { transform: 'translateX(0)' },
    }),
  },
  enterFromStart: {
    animationName: stylex.keyframes({
      from: { transform: 'translateX(-100%)' },
      to: { transform: 'translateX(0)' },
    }),
  },
  exitToStart: {
    animationName: stylex.keyframes({
      from: { transform: 'translateX(0)' },
      to: { transform: 'translateX(-100%)' },
    }),
  },
  exitToEnd: {
    animationName: stylex.keyframes({
      from: { transform: 'translateX(0)' },
      to: { transform: 'translateX(100%)' },
    }),
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
