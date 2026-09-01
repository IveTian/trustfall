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
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: 0,
    boxSizing: 'border-box',
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: text.familyUi,
    fontWeight: text.weightMedium,
    gap: space[2],
    justifyContent: 'center',
    opacity: {
      ':disabled': 0.55,
    },
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
    paddingBlock: 0,
    textDecoration: 'none',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color, color',
    transitionTimingFunction: motion.ease,
    whiteSpace: 'nowrap',
  },
  sm: {
    fontSize: text.sizeCaption,
    height: control.heightSm,
    lineHeight: text.lineCaption,
    paddingInline: space[2],
  },
  md: {
    fontSize: text.sizeBodySmall,
    height: control.heightMd,
    lineHeight: text.lineBodySmall,
    paddingInline: space[3],
  },
  lg: {
    fontSize: text.sizeBody,
    height: control.heightLg,
    lineHeight: text.lineBody,
    paddingInline: space[4],
  },
  primary: {
    backgroundColor: {
      default: color.accent,
      ':hover': color.accentHover,
      ':active': color.accentActive,
    },
    color: color.textInverse,
  },
  secondary: {
    backgroundColor: {
      default: color.surfaceSunken,
      ':hover': color.border,
    },
    color: color.textPrimary,
  },
  danger: {
    backgroundColor: {
      default: color.partialOutage,
      ':hover': color.majorOutage,
    },
    color: color.textInverse,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: {
      default: color.textMuted,
      ':hover': color.textPrimary,
    },
    height: 'auto',
    paddingInline: 0,
  },
  fullWidth: {
    width: '100%',
  },
  withEnd: {
    justifyContent: 'space-between',
  },
  icon: {
    height: control.heightMd,
    paddingInline: space[2],
    width: control.heightMd,
  },
  spinner: {
    animationDuration: {
      default: '0.7s',
      [breakpoints.reduceMotion]: '0ms',
    },
    animationIterationCount: 'infinite',
    animationName: stylex.keyframes({
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    }),
    animationTimingFunction: 'linear',
    borderColor: 'currentColor transparent transparent transparent',
    borderRadius: radius.pill,
    borderStyle: 'solid',
    borderWidth: control.focusWidth,
    boxSizing: 'border-box',
    display: 'block',
    height: '1em',
    width: '1em',
  },
});

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: ReactNode;
  startEnhancer?: ReactNode;
  endEnhancer?: ReactNode;
};

function EnhancerSpinner() {
  return <span aria-hidden {...stylex.props(styles.spinner)} />;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  loadingLabel,
  startEnhancer,
  endEnhancer,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const spinnerInEnhancer = Boolean(loading && endEnhancer);
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...stylex.props(
        styles.button,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        fullWidth && endEnhancer != null && styles.withEnd,
      )}
    >
      {startEnhancer}
      {spinnerInEnhancer && loadingLabel != null ? loadingLabel : children}
      {spinnerInEnhancer ? <EnhancerSpinner /> : endEnhancer}
    </button>
  );
}

export function IconButton({
  label,
  children,
  variant = 'ghost',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      aria-label={label}
      {...stylex.props(styles.button, styles[variant], styles[size], styles.icon)}
    >
      {children}
    </button>
  );
}
