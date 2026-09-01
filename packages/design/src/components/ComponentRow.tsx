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
  copy: {
    flex: '1 1 auto',
  },
});

export function ComponentRow({
  displayName,
  description,
  status,
  last = false,
}: {
  displayName: string;
  description?: string | null;
  status: ComponentStatus;
  last?: boolean;
}) {
  return (
    <li {...stylex.props(styles.row, last && styles.last)}>
      <div {...stylex.props(styles.copy)}>
        <Text as="h3" tone="title">
          {displayName}
        </Text>
        {description ? <Text tone="caption">{description}</Text> : null}
      </div>
      <StatusPill status={status} />
    </li>
  );
}
