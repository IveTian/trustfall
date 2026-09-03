import * as stylex from '@stylexjs/stylex';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return el?.closest('a, button') != null;
}

const styles = stylex.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    padding: space[4],
  },
  // No chrome of its own: for a card that sits inside a surface which already
  // draws the box, such as a public-site block.
  plain: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    padding: 0,
  },
  // The whole card is the control: quiet at rest, a soft shadow lift on
  // hover, the standard ring on focus. Nested links keep their own click.
  clickable: {
    boxShadow: {
      default: 'none',
      ':hover': shadow.hover,
    },
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: 'pointer',
    display: 'block',
    fontFamily: text.familyUi,
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
    textAlign: 'start',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'box-shadow',
    transitionTimingFunction: motion.ease,
    width: '100%',
  },
});

export type CardSurface = 'card' | 'plain';

export function Card({
  children,
  as: Tag = 'div',
  surface = 'card',
  onClick,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'article';
  /** `plain` drops the border, fill and padding: the surface around it draws the box. */
  surface?: CardSurface;
  /** Makes the whole card the control. Nested links keep their own activation. */
  onClick?: () => void;
}) {
  const plain = surface === 'plain' && styles.plain;
  if (onClick != null) {
    return (
      <Tag
        {...stylex.props(styles.card, styles.clickable, plain)}
        tabIndex={0}
        onClick={(event: MouseEvent<HTMLElement>) => {
          if (isInteractiveTarget(event.target)) return;
          onClick();
        }}
        onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          if (event.currentTarget !== event.target) return;
          event.preventDefault();
          onClick();
        }}
      >
        {children}
      </Tag>
    );
  }
  return <Tag {...stylex.props(styles.card, plain)}>{children}</Tag>;
}
