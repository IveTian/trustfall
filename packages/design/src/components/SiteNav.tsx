import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { radius as radiusToken } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import type { MenuRadius } from './Menu.tsx';
import { ThemeMenu } from './ThemeMenu.tsx';
import { TimeZoneMenu } from './TimeZoneMenu.tsx';

export type SiteNavItem = { id: string; label: string; href: string };

/**
 * The bar across the top of every public page. It sits directly on the mesh
 * canvas in the canvas's own color, edge to edge: the site's name on the start
 * edge, the pages in the middle, the reader's own controls — clock and
 * appearance — on the end edge. Below the `md` breakpoint the pages drop to a
 * second row so nothing has to shrink.
 *
 * Route navigation, so the pages are links; `current` names the one the
 * reader is on.
 *
 * The page pills and the two menus take a small corner by default; `radius`
 * lets a console that wears the bar keep its own rounder controls, or a
 * stricter chrome go square.
 */
export function SiteNav({
  siteName,
  items,
  current,
  sticky = true,
  radius = 'sm',
}: {
  siteName: string;
  items: readonly SiteNavItem[];
  current?: string;
  /** Off only where the bar is shown as a specimen rather than worn by a page. */
  sticky?: boolean;
  /** Corner treatment for the page pills and the menus. */
  radius?: MenuRadius;
}) {
  return (
    <header {...stylex.props(styles.bar, sticky && styles.sticky)}>
      <a href="/" {...stylex.props(styles.brand)}>
        {siteName}
      </a>
      <nav aria-label="Site" {...stylex.props(styles.nav)}>
        <ul {...stylex.props(styles.list)}>
          {items.map((item) => {
            const active = item.id === current;
            return (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  {...stylex.props(styles.link, linkRadius[radius], active && styles.linkActive)}
                >
                  {active ? (
                    <span aria-hidden {...stylex.props(styles.pill, linkRadius[radius])} />
                  ) : null}
                  <span
                    data-tf-site-nav-label=""
                    {...stylex.props(
                      styles.label,
                      styles.labelName(`tf-site-nav-label-${item.id}`),
                    )}
                  >
                    {item.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div {...stylex.props(styles.controls)}>
        <TimeZoneMenu radius={radius} />
        <ThemeMenu radius={radius} />
      </div>
    </header>
  );
}

const linkRadius = stylex.create({
  none: { borderRadius: 0 },
  sm: { borderRadius: radiusToken.sm },
  md: { borderRadius: radiusToken.md },
});

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    backgroundColor: color.surface,
    borderBlockEndColor: color.borderGrid,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    boxSizing: 'border-box',
    columnGap: space[3],
    display: 'grid',
    gridTemplateColumns: {
      default: '1fr auto',
      [breakpoints.md]: '1fr auto 1fr',
    },
    minBlockSize: control.headerHeight,
    paddingBlock: space[2],
    paddingInline: {
      default: space[4],
      [breakpoints.md]: space[5],
    },
    rowGap: space[2],
    width: '100%',
  },
  sticky: {
    insetBlockStart: 0,
    position: 'sticky',
    zIndex: zIndex.header,
  },
  brand: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    fontWeight: text.weightBold,
    gridColumn: '1',
    gridRow: '1',
    justifySelf: 'start',
    lineHeight: text.lineBody,
    minWidth: 0,
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': control.focusOffset,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nav: {
    gridColumn: {
      default: '1 / -1',
      [breakpoints.md]: '2',
    },
    gridRow: {
      default: '2',
      [breakpoints.md]: '1',
    },
    justifySelf: 'center',
    minWidth: 0,
  },
  list: {
    display: 'flex',
    gap: space[1],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  // Hover is type only — the label darkens — so the one lifted surface in the
  // bar stays the current page.
  link: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    // The hairline is always drawn so the active pill does not nudge the row.
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxSizing: 'border-box',
    color: {
      default: color.navText,
      ':hover': color.navTextActive,
    },
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    minBlockSize: control.heightMd,
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': control.focusOffset,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
    paddingInline: space[3],
    position: 'relative',
    textDecoration: 'none',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'color',
    transitionTimingFunction: motion.ease,
    whiteSpace: 'nowrap',
  },
  linkActive: {
    color: {
      default: color.navTextActive,
      ':hover': color.navTextActive,
    },
  },
  // On the canvas, the current page is the one lifted surface: white,
  // hairlined, the same pill the console rail uses. It is its own element,
  // laid over the link's transparent hairline, and named for the view
  // transition: when the reader crosses to another page the pill alone
  // travels to its new place (site-shell.css); the labels stay where they are.
  pill: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.subtle,
    boxSizing: 'border-box',
    inset: `calc(${mesh.line} * -1)`,
    pointerEvents: 'none',
    position: 'absolute',
    viewTransitionName: 'tf-site-nav-active',
  },
  // Positioned so it paints over the pill, which comes first in the DOM, and
  // named so the view transition lifts it along with the pill: an unnamed
  // label would be part of the page snapshot, under the travelling pill.
  // site-shell.css stacks the lifted labels above the pill.
  label: {
    position: 'relative',
  },
  labelName: (name: string) => ({
    viewTransitionName: name,
  }),
  controls: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
    gridColumn: {
      default: '2',
      [breakpoints.md]: '3',
    },
    gridRow: '1',
    justifySelf: 'end',
  },
});
