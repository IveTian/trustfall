import { Card, Icon, RelativeTime, RichTextBody, Stack, StatusPill, Text } from '@trustfall/design';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';

export type IncidentSummary = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  // Newest first; the first entry is the incident's latest word.
  updates: Array<{ id: string; body: string; created_at: string }>;
};

const absoluteTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * The console's incident card: title with a trailing arrow, the status pills,
 * the latest update, and when it landed. The whole card opens the timeline.
 */
export function IncidentSummaryCard({
  incident,
  onOpen,
}: {
  incident: IncidentSummary;
  onOpen: () => void;
}) {
  const latest = incident.updates[0];
  return (
    <Card onClick={onOpen}>
      <Stack gap={2}>
        <Stack direction="horizontal" justify="between" gap={3}>
          <Text tone="label">{incident.title}</Text>
          <Text tone="muted" as="span">
            <Icon name="arrow-right-line" size={16} />
          </Text>
        </Stack>
        <Stack direction="horizontal" gap={2}>
          <StatusPill status={incident.status} kind="incident" />
          <StatusPill status={incident.impact} kind="impact" />
        </Stack>
        {latest ? (
          <>
            <RichTextBody markdown={latest.body} size="small" muted />
            <Text tone="caption">
              {absoluteTime.format(new Date(latest.created_at))} ·{' '}
              <RelativeTime value={latest.created_at} />
            </Text>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}
