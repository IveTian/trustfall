import * as stylex from '@stylexjs/stylex';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { breakpoints, control, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  root: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    gap: space[2],
  },
  // Like Select, this keeps the native control for its behavior and
  // accessibility, and restyles it: accent-color repaints the check itself.
  box: {
    accentColor: color.accent,
    cursor: 'inherit',
    flexShrink: 0,
    height: space[4],
    margin: 0,
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
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'accent-color',
    transitionTimingFunction: motion.ease,
    width: space[4],
  },
  label: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
  },
});

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label {...stylex.props(styles.root)}>
      <input type="checkbox" {...props} {...stylex.props(styles.box)} />
      <span {...stylex.props(styles.label)}>{label}</span>
    </label>
  );
}
