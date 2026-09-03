import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import type { StatusIconKind, StatusTone } from '../status.ts';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  svg: {
    flexShrink: 0,
    height: space[4],
    width: space[4],
  },
  lg: {
    height: space[5],
    width: space[5],
  },
  // A Remix glyph follows the font size, so the box sets it to the mark's size.
  remix: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: space[4],
    height: space[4],
    justifyContent: 'center',
    width: space[4],
  },
  remixLg: {
    fontSize: space[5],
    height: space[5],
    width: space[5],
  },
  operational: { color: color.operational },
  degraded: { color: color.degraded },
  partialOutage: { color: color.partialOutage },
  majorOutage: { color: color.majorOutage },
  maintenance: { color: color.maintenance },
});

export function StatusIcon({
  icon,
  tone,
  title,
  size = 'md',
}: {
  icon: StatusIconKind;
  tone: StatusTone;
  title: string;
  /** `lg` for the one glyph a page leads with; everything else stays `md`. */
  size?: 'md' | 'lg';
}) {
  if (typeof icon === 'object') {
    return (
      <span
        role="img"
        aria-label={title}
        title={title}
        {...stylex.props(styles.remix, styles[tone], size === 'lg' && styles.remixLg)}
      >
        <Icon name={icon.remix} />
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="false"
      role="img"
      {...stylex.props(styles.svg, styles[tone], size === 'lg' && styles.lg)}
    >
      <title>{title}</title>
      {icon === 'check' ? (
        <path
          fill="currentColor"
          d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm2.2 4.2L7.1 8.8 5.8 7.5 4.7 8.6l2.4 2.4 4.2-4.2-1.1-1.1Z"
        />
      ) : null}
      {icon === 'diamond' ? (
        <path fill="currentColor" d="M8 1.2 14.8 8 8 14.8 1.2 8 8 1.2Z" />
      ) : null}
      {icon === 'triangle' ? <path fill="currentColor" d="M8 2.2 14.6 13.5H1.4L8 2.2Z" /> : null}
      {icon === 'stop' ? (
        <path
          fill="currentColor"
          d="M5.2 1.5h5.6L14.5 5.2v5.6L10.8 14.5H5.2L1.5 10.8V5.2L5.2 1.5Z"
        />
      ) : null}
      {icon === 'wrench' ? (
        <path
          fill="currentColor"
          d="M13.2 2.8a3.4 3.4 0 0 0-5.4 2.7c0 .3.1.7.2 1L3.2 11.3l1.5 1.5 4.8-4.8c.3.1.7.2 1 .2a3.4 3.4 0 0 0 2.7-5.4L11.4 7 9 4.6l2.2-1.8Z"
        />
      ) : null}
      {icon === 'dot' ? <circle fill="currentColor" cx="8" cy="8" r="3.2" /> : null}
    </svg>
  );
}
