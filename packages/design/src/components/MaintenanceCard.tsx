import type { MaintenanceRecurrence, MaintenanceStatus } from '@trustfall/shared';
import { describeRecurrence, formatInstant, formatWindow } from '../maintenance-copy.ts';
import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { control } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Card, type CardSurface } from './Card.tsx';
import { Icon } from './Icon.tsx';
import { RelativeTime } from './RelativeTime.tsx';
import { RichTextBody } from './RichTextBody.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

export type PublicMaintenance = {
  id: string;
  title: string;
  status: MaintenanceStatus;
  /** The tracked window: under way, or next to open. */
  windowStart: number;
  windowEnd: number;
  /** The first window's start, which a recurrence describes itself from. */
  startTime: number;
  recurrence: MaintenanceRecurrence | null;
  timeZone: string;
  affectedComponents: Array<{ componentId: string; displayName: string }>;
  /** Newest first; the announcement is last. */
  updates: Array<{ id: string; status: MaintenanceStatus; body: string; createTime: number }>;
  href?: string;
};

/**
 * The public maintenance card, laid out like the console's: the title with a
 * trailing arrow when it opens the maintenance, the status, when the window
 * runs (in the schedule's own zone, since that is the zone it was promised
 * in) and how far off that is, how it repeats, the latest word, and what it
 * touches.
 */
export function MaintenanceCard({
  maintenance,
  surface,
  locale,
}: {
  maintenance: PublicMaintenance;
  surface?: CardSurface;
  /** Formatting locale; the viewer's own when omitted. A cached page pins it. */
  locale?: string;
}) {
  const latest = maintenance.updates[0];
  const zone = maintenance.timeZone;
  const title = <Text tone="label">{maintenance.title}</Text>;
  return (
    <Card as="article" surface={surface}>
      <Stack gap={2}>
        {maintenance.href ? (
          <a href={maintenance.href} {...stylex.props(styles.open)}>
            {title}
            <span {...stylex.props(styles.arrow)}>
              <Icon name="arrow-right-line" size={16} />
            </span>
          </a>
        ) : (
          title
        )}
        <Stack direction="horizontal" gap={2} wrap>
          <StatusPill status={maintenance.status} kind="maintenance" />
        </Stack>
        <Text tone="caption">
          {maintenance.status === 'IN_PROGRESS' ? (
            <>
              Ends {formatInstant(maintenance.windowEnd, zone, locale)} ·{' '}
              <RelativeTime value={maintenance.windowEnd} />
            </>
          ) : maintenance.status === 'SCHEDULED' ? (
            <>
              {formatWindow(maintenance.windowStart, maintenance.windowEnd, zone, locale)} ·{' '}
              <RelativeTime value={maintenance.windowStart} />
            </>
          ) : (
            formatWindow(maintenance.windowStart, maintenance.windowEnd, zone, locale)
          )}
        </Text>
        {maintenance.recurrence ? (
          <Text tone="caption">
            {describeRecurrence(maintenance.recurrence, maintenance.startTime, zone, locale)}
          </Text>
        ) : null}
        {latest ? <RichTextBody markdown={latest.body} size="small" muted /> : null}
        {maintenance.affectedComponents.length > 0 ? (
          <Text tone="caption">
            Affects {maintenance.affectedComponents.map((item) => item.displayName).join(', ')}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = stylex.create({
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
