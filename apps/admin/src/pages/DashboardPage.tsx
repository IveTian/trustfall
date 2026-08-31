import { Button, Card, Stack, StatusPill, Text, Toast, componentStatusPresentation } from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';

type Component = {
  name: string;
  displayName: string;
  status: ComponentStatus;
};

export function DashboardPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  async function refresh() {
    const data = await api<{ components: Component[] }>('/api/v1/components');
    setComponents(data.components);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function setStatus(name: string, status: ComponentStatus) {
    await api(`/api/v1/${name}:setStatus`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    setToast(`Updated ${name.split('/')[1]}`);
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
            <Card key={component.name}>
              <Stack gap={3}>
                <Stack direction="horizontal" gap={2}>
                  <Text as="h2" tone="title">
                    {component.displayName}
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
                        onClick={() => setStatus(component.name, status)}
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
