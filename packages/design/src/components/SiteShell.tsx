import '../site-shell.css';
import type { ReactNode } from 'react';
import { MESH_CELL_PX } from '../tokens/mesh.ts';

/**
 * The public site's page: the `SiteNav` worn across the top, and under it the
 * mesh canvas from edge to edge with one white reading panel on it. The panel
 * is a whole number of cells wide and tall and the mesh originates at its
 * edges, so its border is the grid — `site-shell-runtime.ts` does the
 * measuring, `site-shell.css` the layout. The document scrolls, so the bar
 * can stick while the panel passes under.
 *
 * `nav` is the bar; it is a prop rather than a child so an Astro page can hand
 * in a hydrated island while the shell itself stays static.
 */
export function SiteShell({
  nav,
  children,
  cols = 9,
}: {
  nav: ReactNode;
  children: ReactNode;
  /** Panel width in cells, at most; narrower viewports get fewer. Odd keeps the CSS fallback centred on a line. */
  cols?: number;
}) {
  return (
    <div className="tf-site-shell">
      {nav}
      <main className="tf-site-main" data-tf-site-main="" data-cell={MESH_CELL_PX} data-cols={cols}>
        <div className="tf-site-panel">
          <div className="tf-site-content">{children}</div>
        </div>
      </main>
    </div>
  );
}
