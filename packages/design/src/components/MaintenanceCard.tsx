import type { MaintenanceRecurrence, MaintenanceStatus } from '@trustfall/shared';
import { describeRecurrence, formatInstant, formatWindow } from '../maintenance-copy.ts';
import { Card, type CardSurface } from './Card.tsx';
import { Link } from './Link.tsx';
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
 * The public page's maintenance card: the status, the title, when the window
 * runs (in the schedule's own zone, since that is the zone it was promised
 * in), how it repeats, what it touches, and the latest word.
 */
export function MaintenanceCard({
  maintenance,
  surface,
}: {
  maintenance: PublicMaintenance;
  surface?: CardSurface;
}) {
  const latest = maintenance.updates[0];
  const underWay = maintenance.status === 'IN_PROGRESS';
  return (
    <Card as="article" surface={surface}>
      <Stack gap={3}>
        <Stack direction="horizontal" gap={2}>
          <StatusPill status={maintenance.status} kind="maintenance" />
        </Stack>
        <Text as="h2" tone="title">
          {maintenance.href ? (
            <Link href={maintenance.href}>{maintenance.title}</Link>
          ) : (
            maintenance.title
          )}
        </Text>
        <Text tone="mono">
          {underWay ? 'Under way until' : 'Scheduled for'}{' '}
          {underWay
            ? formatInstant(maintenance.windowEnd, maintenance.timeZone)
            : formatWindow(maintenance.windowStart, maintenance.windowEnd, maintenance.timeZone)}
        </Text>
        {maintenance.recurrence ? (
          <Text tone="caption">
            {describeRecurrence(
              maintenance.recurrence,
              maintenance.startTime,
              maintenance.timeZone,
            )}
          </Text>
        ) : null}
        {latest ? <RichTextBody markdown={latest.body} /> : null}
        {maintenance.affectedComponents.length > 0 ? (
          <Text tone="caption">
            Affects {maintenance.affectedComponents.map((item) => item.displayName).join(', ')}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}
