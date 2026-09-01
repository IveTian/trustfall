import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES, INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
import { useState } from 'react';
import { Button } from './Button.tsx';
import { Card } from './Card.tsx';
import { EmptyState } from './EmptyState.tsx';
import { Field, Input, Select, Textarea } from './Field.tsx';
import { Icon } from './Icon.tsx';
import { Panel, PanelHeader, PanelList, PanelRow } from './Panel.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { StatusSelect } from './StatusSelect.tsx';
import { Text } from './Text.tsx';

const SAMPLE_ROWS = [
  { id: 'web', name: 'Web application', description: 'Dashboard, sign-in, and the status page.' },
  { id: 'api', name: 'Public API', description: 'REST endpoints under api.example.com.' },
];

/** The console's status control, wired to local state so the gallery is live. */
function StatusRow({ name, description }: { name: string; description: string }) {
  const [status, setStatus] = useState<ComponentStatus>('OPERATIONAL');
  return (
    <PanelRow
      title={name}
      description={description}
      end={<StatusSelect status={status} componentName={name} onChange={setStatus} />}
    />
  );
}

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
          <Stack direction="horizontal" gap={2} wrap>
            {COMPONENT_STATUSES.filter((status) => status !== 'STATUS_UNSPECIFIED').map(
              (status) => (
                <StatusPill key={status} status={status as ComponentStatus} />
              ),
            )}
          </Stack>
          <Text as="h2" tone="title">
            Incident status
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
            {INCIDENT_STATUSES.map((status) => (
              <StatusPill key={status} status={status} kind="incident" />
            ))}
          </Stack>
          <Text as="h2" tone="title">
            Impact
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
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
          <Stack direction="horizontal" gap={2} wrap>
            <Button>Save changes</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="danger">Resolve incident</Button>
            <Button variant="ghost">Sign out</Button>
          </Stack>
          <Button size="lg" fullWidth endEnhancer={<Icon name="arrow-right-fill" />}>
            Continue
          </Button>
          <Field label="Display name" htmlFor="gallery-name">
            <Input id="gallery-name" defaultValue="API" />
          </Field>
          <Field label="Update" htmlFor="gallery-update">
            <Textarea
              id="gallery-update"
              defaultValue="We are investigating elevated error rates."
            />
          </Field>
          <Field label="Status" htmlFor="gallery-status">
            <Select id="gallery-status" defaultValue="OPERATIONAL">
              <option value="OPERATIONAL">Operational</option>
              <option value="DEGRADED_PERFORMANCE">Degraded performance</option>
            </Select>
          </Field>
        </Stack>
      </Card>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Console list
        </Text>
        <Text tone="muted">
          A hairline panel with full-bleed rows. The status menu replaces a native select so the
          popup follows the theme.
        </Text>
        <Panel>
          <PanelHeader title="Components" caption="Two services, one control each." />
          <PanelList>
            {SAMPLE_ROWS.map((row) => (
              <StatusRow key={row.id} name={row.name} description={row.description} />
            ))}
          </PanelList>
        </Panel>
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Empty state
        </Text>
        <Card>
          <EmptyState
            icon="stack-fill"
            title="No components yet"
            description="Name what is missing, say what it will do, offer one way to start."
            actions={<Button startEnhancer={<Icon name="add-fill" />}>Add a component</Button>}
          />
        </Card>
      </Stack>
    </Stack>
  );
}
