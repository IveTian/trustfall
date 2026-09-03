import {
  Card,
  describeRecurrence,
  formatInstant,
  formatWindow,
  Icon,
  RelativeTime,
  RichTextBody,
  Stack,
  StatusPill,
  Text,
} from '@trustfall/design';
import type { Maintenance } from '../lib/maintenance.ts';
import { toRecurrence } from '../lib/maintenance.ts';

/**
 * The console's maintenance card: title with a trailing arrow, the status,
 * when the window runs, how it repeats, and the latest word. The whole card
 * opens the maintenance.
 */
export function MaintenanceSummaryCard({
  maintenance,
  onOpen,
}: {
  maintenance: Maintenance;
  onOpen: () => void;
}) {
  const latest = maintenance.updates[0];
  const recurrence = toRecurrence(maintenance.schedule.recurrence);
  const start = Date.parse(maintenance.starts_at);
  const end = Date.parse(maintenance.ends_at);
  const zone = maintenance.schedule.time_zone;
  return (
    <Card onClick={onOpen}>
      <Stack gap={2}>
        <Stack direction="horizontal" justify="between" gap={3}>
          <Text tone="label">{maintenance.title}</Text>
          <Text tone="muted" as="span">
            <Icon name="arrow-right" size={16} />
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={2} wrap>
          <StatusPill status={maintenance.status} kind="maintenance" />
        </Stack>
        <Text tone="caption">
          {maintenance.status === 'IN_PROGRESS' ? (
            <>
              Ends {formatInstant(end, zone)} · <RelativeTime value={end} />
            </>
          ) : maintenance.status === 'SCHEDULED' ? (
            <>
              {formatWindow(start, end, zone)} · <RelativeTime value={start} />
            </>
          ) : (
            formatWindow(start, end, zone)
          )}
        </Text>
        {recurrence ? (
          <Text tone="caption">
            {describeRecurrence(recurrence, Date.parse(maintenance.schedule.starts_at), zone)}
          </Text>
        ) : null}
        {latest ? <RichTextBody markdown={latest.body} size="small" muted /> : null}
      </Stack>
    </Card>
  );
}
