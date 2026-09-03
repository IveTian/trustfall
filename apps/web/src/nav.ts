import type { SiteNavItem } from '@trustfall/design';

/** The public site's pages, in the order the bar shows them. */
export const SITE_NAV = [
  { id: 'overview', label: 'Overview', href: '/' },
  { id: 'status', label: 'Status', href: '/status' },
  { id: 'history', label: 'History', href: '/incidents' },
  { id: 'maintenance', label: 'Maintenance', href: '/maintenance' },
] as const satisfies readonly SiteNavItem[];

export type SiteNavId = (typeof SITE_NAV)[number]['id'];

/**
 * Which bar item a path belongs to: the item whose href is the path or one of
 * its ancestors, longest first, so `/incidents/abc` is History. The root only
 * matches itself. Pages state this on the server; the client re-derives it
 * after a client-router swap.
 */
export function siteNavIdFor(pathname: string): SiteNavId | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  let best: (typeof SITE_NAV)[number] | undefined;
  for (const item of SITE_NAV) {
    const href = item.href.replace(/\/+$/, '') || '/';
    const hit = href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
    if (hit && (!best || href.length > best.href.length)) {
      best = item;
    }
  }
  return best?.id;
}
