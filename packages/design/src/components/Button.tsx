import * as stylex from '@stylexjs/stylex';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { breakpoints, control, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    fontWeight: text.weightBold,
    gap: space[2],
    justifyContent: 'center',
    lineHeight: text.lineBody,
    paddingBlock: space[2],
    paddingInline: space[4],
    textDecoration: 'none',
    transitionDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color, border-color, color',
    transitionTimingFunction: motion.ease,
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
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    opacity: {
      ':disabled': 0.55,
    },
  },
  primary: {
    backgroundColor: color.accent,
    borderColor: color.accent,
    color: color.textInverse,
  },
  secondary: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    color: color.textPrimary,
  },
  danger: {
    backgroundColor: color.majorOutage,
    borderColor: color.majorOutage,
    color: color.textInverse,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: color.accent,
    paddingInline: space[2],
  },
  icon: {
    padding: space[2],
  },
});

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button {...props} {...stylex.props(styles.button, styles[variant])}>
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  variant = 'ghost',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      {...props}
      aria-label={label}
      {...stylex.props(styles.button, styles[variant], styles.icon)}
    >
      {children}
    </button>
  );
}
