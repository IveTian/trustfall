import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    padding: space[4],
  },
  // The whole card is the control: quiet at rest, a soft shadow lift on
  // hover, the standard ring on focus. Don't nest other interactive elements
  // inside.
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

export function Card({
  children,
  as: Tag = 'div',
  onClick,
}: {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'article';
  /** Makes the whole card the control; it renders as a button. */
  onClick?: () => void;
}) {
  if (onClick != null) {
    return (
      <button type="button" onClick={onClick} {...stylex.props(styles.card, styles.clickable)}>
        {children}
      </button>
    );
  }
  return <Tag {...stylex.props(styles.card)}>{children}</Tag>;
}
