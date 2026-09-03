import '../site-shell.css';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { SITE_MESH_CELL_PX, SITE_MESH_COLS } from '../tokens/mesh.ts';
import { text } from '../tokens/text.stylex.ts';

/**
 * The public site's page: the `SiteNav` worn across the top, and under it the
 * mesh canvas from edge to edge with the page's blocks on it. A page is
 * written as a sequence of `SitePanel`s, `SiteHeading`s and `SiteGroup`s:
 * a lone panel stands a cell apart from its neighbours, a heading sits on
 * the canvas in the cell above the group it names, and the panels of a group
 * stack on one another sharing a grid line. Every panel is a whole number of
 * cells wide and tall and the mesh originates at its edges, so its border is
 * the grid — `site-shell-runtime.ts` does the measuring, `site-shell.css`
 * the layout. The document scrolls, so the bar can stick while the blocks
 * pass under.
 *
 * `nav` is the bar; it is a prop rather than a child so an Astro page can hand
 * in a hydrated island while the shell itself stays static.
 */
export function SiteShell({
  nav,
  children,
  cols = SITE_MESH_COLS,
}: {
  nav: ReactNode;
  /** `SitePanel`s, `SiteHeading`s and `SiteGroup`s, in reading order. */
  children: ReactNode;
  /** Panel width in cells, at most; narrower viewports get fewer. Odd keeps the CSS fallback centred on a line. */
  cols?: number;
}) {
  return (
    <div className="tf-site-shell">
      {nav}
      <main
        className="tf-site-main"
        data-tf-site-main=""
        data-cell={SITE_MESH_CELL_PX}
        data-cols={cols}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * One white block on the canvas. A page is a stack of these, each answering
 * one question — the current state, what is under way, what happened lately
 * — so a reader can find the one they came for without reading the rest.
 */
export function SitePanel({
  children,
  as: Tag = 'section',
}: {
  children: ReactNode;
  as?: 'section' | 'article' | 'div';
}) {
  return (
    <Tag className="tf-site-panel">
      <div className="tf-site-content">{children}</div>
    </Tag>
  );
}

/**
 * A title written on the canvas itself, naming the group of blocks under it.
 * It takes one cell, with the words sitting at its foot, close to what they
 * name and clear of the block above.
 */
export function SiteHeading({
  children,
  as: Tag = 'h2',
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
}) {
  const { className, style } = stylex.props(styles.heading);
  return (
    <Tag className={`tf-site-heading ${className ?? ''}`.trim()} style={style}>
      {children}
    </Tag>
  );
}

/**
 * Blocks that belong together — one per service group, one per incident —
 * stacked on one another so they read as a run of like things.
 */
export function SiteGroup({ children }: { children: ReactNode }) {
  return <div className="tf-site-group">{children}</div>;
}

const styles = stylex.create({
  heading: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeTitle,
    fontWeight: text.weightBold,
    lineHeight: text.lineTitle,
    margin: 0,
  },
});
