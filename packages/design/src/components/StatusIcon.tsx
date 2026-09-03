import * as stylex from '@stylexjs/stylex';
import type { IconName } from '@trustfall/icon';
import type { StatusTone } from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  // The glyph follows the font size, so the box sets it to the mark's size.
  box: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: space[4],
    height: space[4],
    justifyContent: 'center',
    width: space[4],
  },
  lg: {
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

/**
 * A status's glyph in its tone, named for assistive technology: the filled
 * mark a service's status wears, or the sign for a phase or an impact.
 * Which glyph is `status.ts`'s call, never the caller's.
 */
export function StatusIcon({
  icon,
  tone,
  title,
  size = 'md',
}: {
  icon: IconName;
  tone: StatusTone;
  title: string;
  /** `lg` for the one glyph a page leads with; everything else stays `md`. */
  size?: 'md' | 'lg';
}) {
  return (
    <span
      role="img"
      aria-label={title}
      title={title}
      {...stylex.props(styles.box, styles[tone], size === 'lg' && styles.lg)}
    >
      <Icon name={icon} />
    </span>
  );
}
