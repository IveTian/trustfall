import { MESH_CELL_PX, MESH_LINE_PX } from './tokens/mesh.ts';

/**
 * Snaps the public site's reading panel to the mesh: as many whole columns as
 * fit (up to the shell's `data-cols`), centred to the pixel, and as many whole
 * rows as the content needs, so all four edges of the panel sit on grid lines
 * while the page still scrolls. No React hooks — the shell is static markup.
 * A client-router swap replaces the main; a mutation observer picks up the
 * new one and lets go of the old.
 */
type Session = { observer: ResizeObserver; observedContent: Element | null };

const sessions = new Map<HTMLElement, Session>();
let started = false;
let scheduled = false;

function readNumber(element: HTMLElement, attr: string, fallback: number): number {
  const raw = element.getAttribute(attr);
  const value = raw == null || raw === '' ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function measure(main: HTMLElement, session: Session): void {
  const cell = readNumber(main, 'data-cell', MESH_CELL_PX);
  const maxCols = readNumber(main, 'data-cols', 9);
  const panel = main.querySelector<HTMLElement>('.tf-site-panel');
  const content = main.querySelector<HTMLElement>('.tf-site-content');

  if (content && content !== session.observedContent) {
    if (session.observedContent) {
      session.observer.unobserve(session.observedContent);
    }
    session.observer.observe(content);
    session.observedContent = content;
  }
  if (!panel || !content) {
    return;
  }

  const viewWidth = main.clientWidth;
  const cols = Math.max(1, Math.min(maxCols, Math.floor((viewWidth - MESH_LINE_PX) / cell)));
  const width = cols * cell;
  const left = Math.max(0, Math.round((viewWidth - width - MESH_LINE_PX) / 2));
  // The panel's outer height is rows × cell + line; its two borders take two
  // lines of that, so the content must fit in rows × cell − line.
  const rows = Math.max(1, Math.ceil((content.offsetHeight + MESH_LINE_PX) / cell));
  const height = rows * cell;

  main.style.setProperty('--tf-site-cell', `${cell}px`);
  main.style.setProperty('--tf-site-line', `${MESH_LINE_PX}px`);
  main.style.setProperty('--tf-site-panel-left', `${left}px`);
  main.style.setProperty('--tf-site-panel-width', `${width}px`);
  main.style.setProperty('--tf-site-panel-height', `${height}px`);
  main.setAttribute('data-tf-site-ready', '');
}

function bind(main: HTMLElement): void {
  let session = sessions.get(main);
  if (!session) {
    const next: Session = {
      observer: new ResizeObserver(() => measure(main, next)),
      observedContent: null,
    };
    session = next;
    sessions.set(main, session);
    session.observer.observe(main);
  }
  measure(main, session);
}

function sweep(): void {
  for (const [main, session] of sessions) {
    if (!main.isConnected) {
      session.observer.disconnect();
      sessions.delete(main);
    }
  }
}

export function bindSiteShells(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.querySelectorAll<HTMLElement>('[data-tf-site-main]').forEach(bind);
  sweep();
}

function scheduleBind(): void {
  if (scheduled) {
    return;
  }
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    bindSiteShells();
  });
}

/** Idempotent. Call once from the site's document entry. */
export function startSiteShellRuntime(): void {
  if (typeof document === 'undefined' || started) {
    return;
  }
  started = true;
  bindSiteShells();
  new MutationObserver(scheduleBind).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
