import '../icons.css';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  icon: {
    display: 'inline-flex',
    flexShrink: 0,
    lineHeight: 1,
  },
  size: (value: string) => ({ fontSize: value }),
});

/**
 * Remix Icon (https://remixicon.com). `name` is the icon name without the
 * "ri-" prefix, e.g. "arrow-right-line", "close-line". Draws in currentColor;
 * without `size` it follows the surrounding font size.
 */
export function Icon({ name, size }: { name: string; size?: number }) {
  const { className, style } = stylex.props(
    styles.icon,
    styles.size(size === undefined ? '1em' : `${size}px`),
  );
  return (
    <i aria-hidden className={`ri-${name}${className ? ` ${className}` : ''}`} style={style} />
  );
}
