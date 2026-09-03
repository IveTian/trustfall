import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import type { StatusInterval } from '../status-history.ts';
import { Icon } from './Icon.tsx';
import { StatusHistoryBar } from './StatusHistoryBar.tsx';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  row: {
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    display: 'flex',
    flexDirection: 'column',
    gap: space[2],
    paddingBlock: space[3],
  },
  // The name and the pill on one line; the history bar, when shown, under both.
  head: {
    alignItems: 'baseline',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
  },
  last: {
    borderBlockEndWidth: 0,
  },
  // Inside a block of its own: the block draws the box, the row just lays out.
  bare: {
    borderBlockEndWidth: 0,
    paddingBlock: 0,
  },
  bareHead: {
    alignItems: 'center',
  },
  copy: {
    flex: '1 1 auto',
  },
  // "Group › Service" on one line: the group quiet, the service the name.
  name: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space[1],
  },
  group: {
    color: color.textMuted,
    fontWeight: 'inherit',
  },
  chevron: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
  },
});

export function ComponentRow({
  displayName,
  group,
  description,
  status,
  last = false,
  as: Tag = 'li',
  bare = false,
  history,
  now,
}: {
  displayName: string;
  /** The group the service belongs to, written before its name as "Group › Service". */
  group?: string | null;
  description?: string | null;
  status: ComponentStatus;
  last?: boolean;
  /** `div` when the row is not in a list, e.g. alone in a public-site block. */
  as?: 'li' | 'div';
  /** No divider and no vertical padding: the surface around it draws the box. */
  bare?: boolean;
  /**
   * The service's non-operational stretches; given, the last ninety days are
   * drawn as a bar under the name. `now` must come with it.
   */
  history?: readonly StatusInterval[];
  now?: number;
}) {
  return (
    <Tag {...stylex.props(styles.row, last && styles.last, bare && styles.bare)}>
      <div {...stylex.props(styles.head, bare && styles.bareHead)}>
        <div {...stylex.props(styles.copy)}>
          <Text as="h3" tone="title">
            {group ? (
              <span {...stylex.props(styles.name)}>
                <span {...stylex.props(styles.group)}>{group}</span>
                <span {...stylex.props(styles.chevron)} aria-hidden="true">
                  <Icon name="chevron-right" size={16} />
                </span>
                <span>{displayName}</span>
              </span>
            ) : (
              displayName
            )}
          </Text>
          {description ? <Text tone="caption">{description}</Text> : null}
        </div>
        <StatusPill status={status} />
      </div>
      {history && now !== undefined ? <StatusHistoryBar intervals={history} now={now} /> : null}
    </Tag>
  );
}
