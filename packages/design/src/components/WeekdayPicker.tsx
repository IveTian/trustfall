import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/**
 * Which days of the week a schedule fires on: seven toggles in a row, Sunday
 * first, each a real button with `aria-pressed`. Value is the set of pressed
 * weekdays, 0 = Sunday, so it drops straight into a recurrence's `byWeekday`.
 */
export function WeekdayPicker({
  value,
  onChange,
  label = 'Days of the week',
  disabled = false,
}: {
  value: readonly number[];
  onChange: (value: number[]) => void;
  label?: string;
  disabled?: boolean;
}) {
  const short = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const long = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
  function toggle(weekday: number) {
    const next = value.includes(weekday)
      ? value.filter((day) => day !== weekday)
      : [...value, weekday];
    onChange(next.sort((a, b) => a - b));
  }
  return (
    <div role="group" aria-label={label} {...stylex.props(styles.row)}>
      {WEEKDAYS.map((weekday) => {
        // Any week works for the names; this one starts on a Sunday.
        const sample = new Date(2026, 8, 6 + weekday);
        const pressed = value.includes(weekday);
        return (
          <button
            key={weekday}
            type="button"
            aria-pressed={pressed}
            aria-label={long.format(sample)}
            disabled={disabled}
            onClick={() => toggle(weekday)}
            {...stylex.props(styles.day, pressed && styles.dayPressed)}
          >
            {short.format(sample)}
          </button>
        );
      })}
    </div>
  );
}

const styles = stylex.create({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space[1],
  },
  day: {
    backgroundColor: {
      default: color.surfaceRaised,
      ':hover': color.surfaceSubtle,
    },
    borderColor: {
      default: color.border,
      ':hover': color.borderStrong,
    },
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    minBlockSize: control.heightMd,
    minInlineSize: control.heightLg,
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
    paddingBlock: space[1],
    paddingInline: space[2],
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color, border-color, color',
    transitionTimingFunction: motion.ease,
  },
  dayPressed: {
    backgroundColor: {
      default: color.solid,
      ':hover': color.solidHover,
    },
    borderColor: {
      default: color.solid,
      ':hover': color.solidHover,
    },
    color: color.textInverse,
  },
});
