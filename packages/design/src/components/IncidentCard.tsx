import * as stylex from '@stylexjs/stylex';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { color } from '../tokens/color.stylex.ts';
import { control } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Card, type CardSurface } from './Card.tsx';
import { DateTime } from './DateTime.tsx';
import { Icon } from './Icon.tsx';
import { RelativeTime } from './RelativeTime.tsx';
import { RichTextBody } from './RichTextBody.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

export type PublicIncidentUpdate = {
  id: string;
  status: IncidentStatus;
  body: string;
  createTime: number;
};

export type PublicIncident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  startTime: number;
  resolveTime?: number | null;
  /** Newest first; the first entry is the incident's latest word. */
  updates: PublicIncidentUpdate[];
  href?: string;
};

/**
 * The public incident card, laid out like the console's: the title with a
 * trailing arrow when it opens the incident, the status pills, the latest
 * update, and when it landed — in the reader's zone, and relative to now.
 */
export function IncidentCard({
  incident,
  surface,
}: {
  incident: PublicIncident;
  surface?: CardSurface;
}) {
  const latest = incident.updates[0];
  const title = <Text tone="label">{incident.title}</Text>;

  return (
    <Card as="article" surface={surface}>
      <Stack gap={2}>
        {incident.href ? (
          <a href={incident.href} {...stylex.props(styles.open)}>
            {title}
            <span {...stylex.props(styles.arrow)}>
              <Icon name="arrow-right-line" size={16} />
            </span>
          </a>
        ) : (
          title
        )}
        <Stack direction="horizontal" gap={2}>
          <StatusPill status={incident.status} kind="incident" />
          <StatusPill status={incident.impact} kind="impact" />
        </Stack>
        {latest ? (
          <>
            <RichTextBody markdown={latest.body} size="small" muted />
            <Text tone="caption">
              <DateTime value={latest.createTime} /> · <RelativeTime value={latest.createTime} />
            </Text>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = stylex.create({
  // The title row is the way in: the name on the start edge, the arrow on the
  // end edge, one link between them.
  open: {
    alignItems: 'center',
    color: 'inherit',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
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
    textDecoration: 'none',
  },
  arrow: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
  },
});
