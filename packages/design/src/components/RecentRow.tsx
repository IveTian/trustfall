import * as stylex from '@stylexjs/stylex';
import { space } from '../tokens/space.stylex.ts';
import { CardTitleLink } from './CardTitleLink.tsx';
import { DateTime } from './DateTime.tsx';
import { RelativeTime } from './RelativeTime.tsx';
import { Text } from './Text.tsx';

/**
 * One line for something that is over: its name on the start edge, when it
 * ended on the end edge — in the reader's zone and relative to now — and
 * the arrow in. Fits a single cell of the public canvas (`density="row"`),
 * so a run of recent incidents and maintenance reads as a list, not a
 * stack of cards.
 */
export function RecentRow({ title, at, href }: { title: string; at: number; href?: string }) {
  const name = <Text tone="label">{title}</Text>;
  const when = (
    <Text tone="caption" as="span">
      <DateTime value={at} /> · <RelativeTime value={at} />
    </Text>
  );
  return href ? (
    <CardTitleLink href={href} end={when}>
      {name}
    </CardTitleLink>
  ) : (
    <div {...stylex.props(styles.row)}>
      <span {...stylex.props(styles.title)}>{name}</span>
      {when}
    </div>
  );
}

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
  },
  title: {
    flexGrow: 1,
    minWidth: 0,
  },
});
