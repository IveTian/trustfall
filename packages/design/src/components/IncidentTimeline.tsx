import type { IncidentStatus } from '@trustfall/shared';
import { RelativeTime } from './RelativeTime.tsx';
import { RichTextBody } from './RichTextBody.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

export function IncidentTimeline({
  updates,
}: {
  updates: Array<{ id: string; status: IncidentStatus; body: string; createTime: number }>;
}) {
  return (
    <Stack as="ol" gap={4}>
      {updates.map((update) => (
        <li key={update.id}>
          <Stack gap={1}>
            <Stack direction="horizontal" gap={2}>
              <StatusPill status={update.status} kind="incident" />
              <Text tone="mono">
                <RelativeTime value={update.createTime} />
              </Text>
            </Stack>
            <RichTextBody markdown={update.body} />
          </Stack>
        </li>
      ))}
    </Stack>
  );
}
