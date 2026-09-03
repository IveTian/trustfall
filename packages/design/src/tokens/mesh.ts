/** Grid cell size in px. CSS length lives in `mesh.cell`; this number is for layout math. */
export const MESH_CELL_PX = 96;
/** The public site's finer grid: two thirds of a standalone-screen cell, so blocks waste less height snapping to rows. */
export const SITE_MESH_CELL_PX = 64;
/** Panel width in site cells, at most. Odd, so the CSS fallback centred on a tile still lands the edges on lines. */
export const SITE_MESH_COLS = 13;
export const MESH_LINE_PX = 1;
/** How far the mesh layer extends past the panel, in cells, so it always covers the viewport. */
export const MESH_EXTENT_CELLS = 40;
