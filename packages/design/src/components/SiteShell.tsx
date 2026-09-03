import '../site-shell.css';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import type { StatusTone } from '../status.ts';
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
  tone,
  density = 'default',
}: {
  children: ReactNode;
  as?: 'section' | 'article' | 'div' | 'li';
  /** Tints the block with the status's muted colour; for the banner when things are not operational. */
  tone?: StatusTone;
  /** `row` shrinks the vertical inset so a one-line block fits in a single cell. */
  density?: 'default' | 'row';
}) {
  const toned = tone ? stylex.props(panelTone[tone]) : null;
  return (
    <Tag
      className={`tf-site-panel ${toned?.className ?? ''}`.trim()}
      style={toned?.style}
      data-tone={tone}
      data-density={density === 'row' ? 'row' : undefined}
    >
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
  tone = 'section',
}: {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  /** `group` is the quieter title for a run of blocks inside a section. */
  tone?: 'section' | 'group';
}) {
  const { className, style } = stylex.props(
    styles.heading,
    tone === 'group' && styles.headingGroup,
  );
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
export function SiteGroup({
  children,
  as: Tag = 'div',
  spacing = 'shared',
}: {
  children: ReactNode;
  as?: 'div' | 'ul';
  /**
   * `shared`: the blocks share a grid line. `cell`: a cell of canvas between
   * them. `half`: half a cell — every second block then sits half a cell off
   * the lines, and the run is padded so what follows is back on one.
   */
  spacing?: 'shared' | 'cell' | 'half';
}) {
  return (
    <Tag className="tf-site-group" data-spacing={spacing === 'shared' ? undefined : spacing}>
      {children}
    </Tag>
  );
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
  headingGroup: {
    color: color.textMuted,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
  },
});

const panelTone = stylex.create({
  operational: { backgroundColor: color.operationalMuted },
  degraded: { backgroundColor: color.degradedMuted },
  partialOutage: { backgroundColor: color.partialOutageMuted },
  majorOutage: { backgroundColor: color.majorOutageMuted },
  maintenance: { backgroundColor: color.maintenanceMuted },
});
