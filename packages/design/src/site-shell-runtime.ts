import { MESH_LINE_PX, SITE_MESH_CELL_PX, SITE_MESH_COLS } from './tokens/mesh.ts';

/**
 * Snaps the public site's reading panels to the mesh: as many whole columns
 * as fit (up to the main's `data-cols`), centred to the pixel, and each panel
 * as many rows as its content needs — whole cells, or half cells where the
 * panel asks (`data-step`), and never fewer than `data-min-rows`. A group of
 * half-cell panels can end between lines, so every group is padded to the
 * next line for whatever follows it. No React hooks — the shell
 * is static markup. A client-router swap replaces the main; a mutation
 * observer picks up the new one and lets go of the old.
 */
type Session = { observer: ResizeObserver; observed: Set<Element> };

const sessions = new Map<HTMLElement, Session>();
let started = false;
let scheduled = false;

function readNumber(element: HTMLElement, attr: string, fallback: number): number {
  const raw = element.getAttribute(attr);
  const value = raw == null || raw === '' ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function measure(main: HTMLElement, session: Session): void {
  const cell = readNumber(main, 'data-cell', SITE_MESH_CELL_PX);
  const maxCols = readNumber(main, 'data-cols', SITE_MESH_COLS);
  // An island's panels are left alone until it has hydrated: React would
  // otherwise diff the snapped height written into their style against the
  // props it rendered. The observer below comes back for them.
  const hydrated = (element: Element) => element.closest('astro-island[ssr]') === null;
  const panels = Array.from(main.querySelectorAll<HTMLElement>('.tf-site-panel')).filter(hydrated);

  // Watch every panel's content; drop what the page no longer has.
  const contents = new Set<Element>();
  for (const panel of panels) {
    const content = panel.querySelector<HTMLElement>('.tf-site-content');
    if (content) {
      contents.add(content);
    }
  }
  for (const element of session.observed) {
    if (!contents.has(element)) {
      session.observer.unobserve(element);
      session.observed.delete(element);
    }
  }
  for (const element of contents) {
    if (!session.observed.has(element)) {
      session.observer.observe(element);
      session.observed.add(element);
    }
  }

  const viewWidth = main.clientWidth;
  const cols = Math.max(1, Math.min(maxCols, Math.floor((viewWidth - MESH_LINE_PX) / cell)));
  const width = cols * cell;
  const left = Math.max(0, Math.round((viewWidth - width - MESH_LINE_PX) / 2));

  main.style.setProperty('--tf-site-cell', `${cell}px`);
  main.style.setProperty('--tf-site-line', `${MESH_LINE_PX}px`);
  main.style.setProperty('--tf-site-panel-left', `${left}px`);
  main.style.setProperty('--tf-site-panel-width', `${width}px`);

  for (const panel of panels) {
    const content = panel.querySelector<HTMLElement>('.tf-site-content');
    if (!content) {
      continue;
    }
    const step = readNumber(panel, 'data-step', 1) * cell;
    const minHeight = readNumber(panel, 'data-min-rows', 1) * cell;
    // A panel's outer height is height + line; its two borders take two
    // lines of that, so the content must fit in height − line.
    const needed = Math.ceil((content.offsetHeight + MESH_LINE_PX) / step) * step;
    panel.style.setProperty('--tf-site-panel-height', `${Math.max(minHeight, needed)}px`);
  }
  main.setAttribute('data-tf-site-ready', '');

  // With the panels sized, pad each group so it ends where a panel would:
  // one line past a grid line. Measured from its children, so the group's
  // own padding from the last pass does not count.
  for (const group of main.querySelectorAll<HTMLElement>('.tf-site-group')) {
    // A group nested in a fold is measured as part of the group around it.
    if (!hydrated(group) || group.parentElement?.closest('.tf-site-group')) {
      continue;
    }
    const last = group.lastElementChild;
    if (!last) {
      group.style.removeProperty('--tf-site-group-pad');
      continue;
    }
    const height = Math.round(
      last.getBoundingClientRect().bottom - group.getBoundingClientRect().top,
    );
    const over = (height - MESH_LINE_PX) % cell;
    group.style.setProperty('--tf-site-group-pad', `${over === 0 ? 0 : cell - over}px`);
  }
}

function bind(main: HTMLElement): void {
  let session = sessions.get(main);
  if (!session) {
    const next: Session = {
      observer: new ResizeObserver(() => measure(main, next)),
      observed: new Set(),
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
    attributeFilter: ['ssr'],
    attributes: true,
    childList: true,
    subtree: true,
  });
}
