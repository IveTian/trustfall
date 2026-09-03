import * as stylex from '@stylexjs/stylex';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

/**
 * An on/off setting that takes effect the moment it is flipped — no Save
 * button follows it. Where a change has to be submitted with other fields,
 * use `Checkbox` inside the form instead.
 *
 * A native button with `role="switch"`: Space and Enter toggle it, screen
 * readers announce on/off, and the focus ring is the system's own.
 */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible name, when no `<label htmlFor={id}>` provides one. */
  label?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      {...stylex.props(styles.track, checked && styles.trackOn, disabled && styles.trackDisabled)}
    >
      <span {...stylex.props(styles.thumb, checked && styles.thumbOn)} />
    </button>
  );
}

const styles = stylex.create({
  track: {
    alignItems: 'center',
    backgroundColor: {
      default: color.borderStrong,
      ':hover': color.textMuted,
    },
    blockSize: space[5],
    borderRadius: radius.pill,
    borderWidth: 0,
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'inline-flex',
    flexShrink: 0,
    // Track is two thumbs wide plus the gutter around one of them.
    inlineSize: `calc(${space[5]} * 2 - ${space[1]})`,
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
    padding: `calc(${space[1]} / 2)`,
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color',
    transitionTimingFunction: motion.ease,
  },
  trackOn: {
    backgroundColor: {
      default: color.solid,
      ':hover': color.solidHover,
    },
  },
  trackDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  thumb: {
    backgroundColor: color.surfaceRaised,
    blockSize: `calc(${space[5]} - ${space[1]})`,
    borderRadius: radius.pill,
    boxShadow: `0 ${mesh.line} ${space[1]} ${color.scrim}`,
    display: 'block',
    inlineSize: `calc(${space[5]} - ${space[1]})`,
    transform: 'translateX(0)',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'transform',
    transitionTimingFunction: motion.ease,
  },
  thumbOn: {
    transform: `translateX(calc(${space[5]} - ${space[1]}))`,
  },
});
