import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Icon } from './Icon.tsx';

/**
 * A public card's title row, and the way in: the name on the start edge, an
 * arrow on the end edge, one link between them. The link's `::after` is
 * stretched over the nearest positioned ancestor — the site block around the
 * card — so the whole block is the click target while the markup keeps a
 * single link with the title as its name. Links inside the card's body sit
 * above the stretch (`richtext.css`) and keep their own click. Hovering
 * anywhere on the block lifts it with a soft shadow: the block reads the
 * link's hover through `data-tf-card-link` (`site-shell.css`). `end` sits
 * between the name and the arrow, on the end edge: a row's time.
 */
export function CardTitleLink({
  href,
  end,
  children,
}: {
  href: string;
  end?: ReactNode;
  children: ReactNode;
}) {
  return (
    <a href={href} data-tf-card-link="" {...stylex.props(styles.open)}>
      <span {...stylex.props(styles.title)}>{children}</span>
      {end == null ? null : <span {...stylex.props(styles.end)}>{end}</span>}
      <span {...stylex.props(styles.arrow)}>
        <Icon name="arrow-right" size={16} />
      </span>
    </a>
  );
}

const styles = stylex.create({
  open: {
    '::after': {
      content: '""',
      inset: 0,
      position: 'absolute',
    },
    alignItems: 'center',
    color: 'inherit',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
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
    textDecoration: 'none',
  },
  title: {
    flexGrow: 1,
    minWidth: 0,
  },
  end: {
    flexShrink: 0,
    textAlign: 'end',
  },
  arrow: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
  },
});
