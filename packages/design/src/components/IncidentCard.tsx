import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { Card, type CardSurface } from './Card.tsx';
import { Link } from './Link.tsx';
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
  updates: PublicIncidentUpdate[];
  href?: string;
};

export function IncidentCard({
  incident,
  surface,
}: {
  incident: PublicIncident;
  surface?: CardSurface;
}) {
  const latest = incident.updates[0];

  return (
    <Card as="article" surface={surface}>
      <Stack gap={3}>
        <Stack direction="horizontal" gap={2}>
          <StatusPill status={incident.status} kind="incident" />
          <StatusPill status={incident.impact} kind="impact" />
        </Stack>
        <Text as="h2" tone="title">
          {incident.href ? <Link href={incident.href}>{incident.title}</Link> : incident.title}
        </Text>
        {latest ? <RichTextBody markdown={latest.body} /> : null}
        <Text tone="mono">
          Started <RelativeTime value={incident.startTime} />
        </Text>
      </Stack>
    </Card>
  );
}
