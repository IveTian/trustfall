import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

/**
 * The public site's canvas scrolls, not the document (site-shell.css), and
 * the client router only remembers the document's scroll: it keeps
 * `scrollY` in `history.state`, zero on a push and the saved value when the
 * reader traverses back or forward, and calls `scrollTo` on the window,
 * which here moves nothing. So the canvas's own scroll is written into the
 * same state slot as it settles, and read back — `restoreSiteScroll`, which
 * Base.astro calls once the blocks are on the grid: inside `astro:after-swap`
 * for a swapped-in canvas, before the view transition captures the new page,
 * and at start for a fresh load of a page the state remembers.
 *
 * On a push or replace the router also copies the window's scroll — always
 * the top — over the leaving entry, the last time just before
 * `astro:before-swap`; the canvas, still the old one there, is written once
 * more. A traverse leaves the entry alone, and by then the state is already
 * the destination's.
 */
const MAIN = '[data-tf-site-main]';

function main(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`.tf-site-shell > ${MAIN}`);
}

function remember(): void {
  const canvas = main();
  const state = history.state;
  if (!canvas || !state || state.scrollY === canvas.scrollTop) {
    return;
  }
  history.replaceState({ ...state, scrollY: canvas.scrollTop }, '');
}

/** Puts the canvas where the history says the reader left it; the top for a new page. */
export function restoreSiteScroll(): void {
  const canvas = main();
  if (!canvas) {
    return;
  }
  const top = history.state?.scrollY;
  canvas.scrollTop = typeof top === 'number' ? top : 0;
}

let started = false;

/** Idempotent. Call once from the site's document entry; keeps the state written. */
export function startSiteScroll(): void {
  if (typeof document === 'undefined' || started) {
    return;
  }
  started = true;

  // Scroll events do not bubble, so they are caught on the way down; the
  // canvas is swapped on every navigation and would otherwise need
  // re-binding. `scrollend` where the browser has it, else the last
  // `scroll` event after a short quiet.
  if ('onscrollend' in window) {
    document.addEventListener(
      'scrollend',
      (event) => {
        if (event.target instanceof Element && event.target.matches(MAIN)) remember();
      },
      { capture: true, passive: true },
    );
  } else {
    let timer: number | undefined;
    document.addEventListener(
      'scroll',
      (event) => {
        if (!(event.target instanceof Element) || !event.target.matches(MAIN)) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(remember, 100);
      },
      { capture: true, passive: true },
    );
  }

  document.addEventListener('astro:before-swap', (event) => {
    if ((event as TransitionBeforeSwapEvent).navigationType !== 'traverse') remember();
  });
}
