import type { CSSProperties, ReactNode } from 'react';
import { MESH_CELL_PX, MESH_EXTENT_CELLS } from '../tokens/mesh.ts';

/**
 * Full-viewport shell for standalone screens: a white panel centered on a
 * repeating mesh. The mesh originates at the panel's top-left so every grid
 * line is a whole number of cells out from its edges. The screen itself never
 * scrolls; overflow scrolls inside the panel.
 *
 * Layout math runs in `mesh-runtime.ts` (no React hooks — Astro SSR). CSS
 * provides a centered fallback until that script measures.
 */
export function MeshScreen({
  cell = MESH_CELL_PX,
  cols = 5,
  rows,
  children,
}: {
  cell?: number;
  cols?: number;
  /** Panel height in cells; defaults to fitting the content. */
  rows?: number;
  children?: ReactNode;
}) {
  const hasPanel = children != null;
  const extent = cell * MESH_EXTENT_CELLS;
  const panelWidth = cols * cell;
  const screenStyle = {
    '--tf-mesh-cell': `${cell}px`,
    '--tf-mesh-cols': String(cols),
  } as CSSProperties;
  const meshStyle: CSSProperties = {
    top: -extent,
    left: -extent,
    width: extent * 2 + panelWidth,
    height: extent * 2 + cell * 20,
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `${extent}px ${extent}px`,
  };

  return (
    <div
      className="tf-mesh-screen"
      data-tf-mesh=""
      data-cell={cell}
      data-cols={cols}
      data-rows={rows}
      style={screenStyle}
    >
      {hasPanel ? (
        <div className="tf-mesh-cluster">
          <div aria-hidden className="tf-mesh-layer" style={meshStyle} />
          <div className="tf-mesh-panel">
            <div className="tf-mesh-content">{children}</div>
          </div>
        </div>
      ) : (
        <div
          aria-hidden
          className="tf-mesh-bare"
          style={{ backgroundSize: `${cell}px ${cell}px` }}
        />
      )}
    </div>
  );
}
