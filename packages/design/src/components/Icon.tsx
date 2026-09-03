import * as stylex from '@stylexjs/stylex';
import { type IconName, icons } from '@trustfall/icon';

const styles = stylex.create({
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
    lineHeight: 1,
  },
  size: (value: string) => ({ fontSize: value }),
});

/**
 * One of the icons named in `@trustfall/icon`, drawn from Central Icons.
 * The console's rail, header and menus wear the `-fill` cuts so the way
 * through the app reads heavier than the actions on a page. Draws in
 * currentColor; without `size` it follows the surrounding font size.
 */
export function Icon({ name, size }: { name: IconName; size?: number }) {
  const Glyph = icons[name];
  return (
    <span
      aria-hidden
      {...stylex.props(styles.icon, styles.size(size === undefined ? '1em' : `${size}px`))}
    >
      <Glyph size="1em" />
    </span>
  );
}
