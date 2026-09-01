import {
  Button,
  Card,
  Stack,
  StatusPill,
  Text,
  Toast,
  componentStatusPresentation,
} from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { api, type Page } from '../lib/api.ts';

type Component = {
  id: string;
  display_name: string;
  status: ComponentStatus;
};

export function DashboardPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function refresh() {
    const page = await api<Page<Component>>('/api/components');
    setComponents(page.items);
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Declaring a status is an edit to the component, not a separate operation.
  async function setStatus(component: Component, status: ComponentStatus) {
    await api(`/api/components/${component.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setToast(`Updated ${component.display_name}`);
    await refresh();
  }

  return (
    <Stack gap={4}>
      <Text as="h1" tone="display">
        Dashboard
      </Text>
      <Text tone="muted">Change a component’s status without opening an incident.</Text>
      {components.length === 0 ? (
        <Text tone="muted">Add a component to start publishing status.</Text>
      ) : (
        <Stack gap={3}>
          {components.map((component) => (
            <Card key={component.id}>
              <Stack gap={3}>
                <Stack direction="horizontal" gap={2}>
                  <Text as="h2" tone="title">
                    {component.display_name}
                  </Text>
                  <StatusPill status={component.status} />
                </Stack>
                <Stack direction="horizontal" gap={2}>
                  {COMPONENT_STATUSES.filter((status) => status !== 'STATUS_UNSPECIFIED').map(
                    (status) => (
                      <Button
                        key={status}
                        type="button"
                        variant={component.status === status ? 'primary' : 'secondary'}
                        onClick={() => setStatus(component, status)}
                      >
                        {componentStatusPresentation[status].label}
                      </Button>
                    ),
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      <Toast message={toast} />
    </Stack>
  );
}
