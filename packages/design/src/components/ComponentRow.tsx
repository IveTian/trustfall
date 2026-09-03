import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  row: {
    alignItems: 'baseline',
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
    paddingBlock: space[3],
  },
  last: {
    borderBlockEndWidth: 0,
  },
  // Inside a block of its own: the block draws the box, the row just lays out.
  bare: {
    alignItems: 'center',
    borderBlockEndWidth: 0,
    paddingBlock: 0,
  },
  copy: {
    flex: '1 1 auto',
  },
});

export function ComponentRow({
  displayName,
  description,
  status,
  last = false,
  as: Tag = 'li',
  bare = false,
}: {
  displayName: string;
  description?: string | null;
  status: ComponentStatus;
  last?: boolean;
  /** `div` when the row is not in a list, e.g. alone in a public-site block. */
  as?: 'li' | 'div';
  /** No divider and no vertical padding: the surface around it draws the box. */
  bare?: boolean;
}) {
  return (
    <Tag {...stylex.props(styles.row, last && styles.last, bare && styles.bare)}>
      <div {...stylex.props(styles.copy)}>
        <Text as="h3" tone="title">
          {displayName}
        </Text>
        {description ? <Text tone="caption">{description}</Text> : null}
      </div>
      <StatusPill status={status} />
    </Tag>
  );
}
