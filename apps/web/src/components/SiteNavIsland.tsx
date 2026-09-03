import { SiteNav, type SiteNavItem } from '@trustfall/design';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { siteNavIdFor } from '../nav.ts';

/**
 * The bar, kept alive across client-router navigations (`transition:persist`
 * in Site.astro) so its menus never re-hydrate. Astro hands the persisted
 * island the new page's props, but asynchronously; the view transition
 * captures its new state as soon as the swap returns. So the active item is
 * re-derived from the URL, synchronously, inside `astro:after-swap` — that is
 * what makes the pill travel instead of jump.
 */
export function SiteNavIsland({
  siteName,
  items,
  current,
}: {
  siteName: string;
  items: readonly SiteNavItem[];
  current?: string;
}) {
  const [active, setActive] = useState(current);
  // A fresh prop from Astro wins over whatever the last swap derived.
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    setActive(current);
  }

  useEffect(() => {
    const onSwap = () => {
      flushSync(() => setActive(siteNavIdFor(window.location.pathname)));
    };
    document.addEventListener('astro:after-swap', onSwap);
    return () => document.removeEventListener('astro:after-swap', onSwap);
  }, []);

  return <SiteNav siteName={siteName} items={items} current={active} />;
}
