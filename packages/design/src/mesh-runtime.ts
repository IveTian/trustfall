import { MESH_CELL_PX, MESH_LINE_PX } from './tokens/mesh.ts';

/**
 * Lociform MeshScreen layout, without React hooks (Astro SSR cannot hydrate
 * this chrome). Measures the panel, snaps it to whole cells, and origins the
 * mesh at the panel's top-left so every grid line is a whole number of cells
 * out from its edges.
 */
type Session = {
  observer: ResizeObserver;
  observedContent: Element | null;
};

const sessions = new Map<HTMLElement, Session>();
let started = false;
let scheduled = false;
let mutationObserver: MutationObserver | null = null;

function readNumber(element: HTMLElement, attr: string, fallback: number): number {
  const raw = element.getAttribute(attr);
  if (raw == null || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function measure(screen: HTMLElement, session: Session): void {
  const cell = readNumber(screen, 'data-cell', MESH_CELL_PX);
  const cols = readNumber(screen, 'data-cols', 5);
  const rowsAttr = screen.getAttribute('data-rows');
  const parsedRows = rowsAttr == null || rowsAttr === '' ? Number.NaN : Number(rowsAttr);
  const fixedRows = Number.isFinite(parsedRows) ? parsedRows : undefined;

  const viewWidth = screen.clientWidth;
  const viewHeight = screen.clientHeight;
  const cluster = screen.querySelector<HTMLElement>('.tf-mesh-cluster');
  const panel = screen.querySelector<HTMLElement>('.tf-mesh-panel');
  const content = screen.querySelector<HTMLElement>('.tf-mesh-content');

  if (content && content !== session.observedContent) {
    if (session.observedContent) {
      session.observer.unobserve(session.observedContent);
    }
    session.observer.observe(content);
    session.observedContent = content;
  } else if (!content && session.observedContent) {
    session.observer.unobserve(session.observedContent);
    session.observedContent = null;
  }

  screen.style.setProperty('--tf-mesh-cell', `${cell}px`);
  screen.style.setProperty('--tf-mesh-line', `${MESH_LINE_PX}px`);

  if (!content || !panel || !cluster) {
    screen.style.removeProperty('--tf-mesh-panel-left');
    screen.style.removeProperty('--tf-mesh-panel-top');
    screen.style.removeProperty('--tf-mesh-panel-width');
    screen.style.removeProperty('--tf-mesh-panel-height');
    screen.style.setProperty('--tf-mesh-origin-x', `${Math.round(viewWidth / 2)}px`);
    screen.style.setProperty('--tf-mesh-origin-y', `${Math.round(viewHeight / 2)}px`);
    screen.setAttribute('data-tf-mesh-ready', '');
    return;
  }

  const width = Math.max(2, Math.min(cols, Math.floor(viewWidth / cell))) * cell;
  const maxRows = Math.max(1, Math.floor(viewHeight / cell));
  const fitRows = fixedRows ?? Math.ceil(content.offsetHeight / cell);
  const rows = Math.min(maxRows, Math.max(1, fitRows));
  const height = rows * cell;
  const left = Math.max(0, Math.round((viewWidth - width) / 2));
  const top = Math.max(0, Math.round((viewHeight - height) / 2));

  screen.style.setProperty('--tf-mesh-origin-x', `${left}px`);
  screen.style.setProperty('--tf-mesh-origin-y', `${top}px`);
  screen.style.setProperty('--tf-mesh-panel-left', `${left}px`);
  screen.style.setProperty('--tf-mesh-panel-top', `${top}px`);
  screen.style.setProperty('--tf-mesh-panel-width', `${width}px`);
  screen.style.setProperty('--tf-mesh-panel-height', `${height}px`);
  screen.setAttribute('data-tf-mesh-ready', '');
}

function bind(screen: HTMLElement): void {
  let session = sessions.get(screen);
  if (!session) {
    const next: Session = {
      observer: new ResizeObserver(() => {
        measure(screen, next);
      }),
      observedContent: null,
    };
    session = next;
    sessions.set(screen, session);
    session.observer.observe(screen);
  }
  measure(screen, session);
}

function sweep(): void {
  for (const [screen, session] of sessions) {
    if (!screen.isConnected) {
      session.observer.disconnect();
      sessions.delete(screen);
    }
  }
}

export function bindMeshScreens(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.querySelectorAll<HTMLElement>('[data-tf-mesh]').forEach(bind);
  sweep();
}

function scheduleBind(): void {
  if (scheduled) {
    return;
  }
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    bindMeshScreens();
  });
}

/** Idempotent. Call once from each app entry (Astro layout, admin main). */
export function startMeshRuntime(): void {
  if (typeof document === 'undefined' || started) {
    return;
  }
  started = true;
  bindMeshScreens();
  mutationObserver = new MutationObserver(scheduleBind);
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
}
