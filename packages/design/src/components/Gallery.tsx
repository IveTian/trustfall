import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES, INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';
import { Field, Input, Select, Textarea } from './Field.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { Text } from './Text.tsx';

export function DesignGallery() {
  return (
    <Stack gap={6}>
      <Text as="h1" tone="display">
        TrustFall gallery
      </Text>
      <Text tone="muted">
        Tokens, status mappings, and primitives. Check each component against CHECKLIST.md before
        shipping it.
      </Text>

      <Card>
        <Stack gap={3}>
          <Text as="h2" tone="title">
            Component status
          </Text>
          <Stack direction="horizontal" gap={2}>
            {COMPONENT_STATUSES.filter((status) => status !== 'STATUS_UNSPECIFIED').map(
              (status) => (
                <StatusPill key={status} status={status as ComponentStatus} />
              ),
            )}
          </Stack>
          <Text as="h2" tone="title">
            Incident status
          </Text>
          <Stack direction="horizontal" gap={2}>
            {INCIDENT_STATUSES.map((status) => (
              <StatusPill key={status} status={status} kind="incident" />
            ))}
          </Stack>
          <Text as="h2" tone="title">
            Impact
          </Text>
          <Stack direction="horizontal" gap={2}>
            {INCIDENT_IMPACTS.map((impact) => (
              <StatusPill key={impact} status={impact} kind="impact" />
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card>
        <Stack gap={3}>
          <Text as="h2" tone="title">
            Controls
          </Text>
          <Stack direction="horizontal" gap={2}>
            <Button>Save changes</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="danger">Resolve incident</Button>
          </Stack>
          <Field label="Display name" htmlFor="gallery-name">
            <Input id="gallery-name" defaultValue="API" />
          </Field>
          <Field label="Update" htmlFor="gallery-update">
            <Textarea id="gallery-update" defaultValue="We are investigating elevated error rates." />
          </Field>
          <Field label="Status" htmlFor="gallery-status">
            <Select id="gallery-status" defaultValue="OPERATIONAL">
              <option value="OPERATIONAL">Operational</option>
              <option value="DEGRADED_PERFORMANCE">Degraded performance</option>
            </Select>
          </Field>
        </Stack>
      </Card>
    </Stack>
  );
}
