import { Button, Card, Field, Input, Select, Stack, StatusPill, Text, Textarea } from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api.ts';

type Group = { name: string; displayName: string };
type Component = {
  name: string;
  displayName: string;
  description: string | null;
  status: ComponentStatus;
  group: string | null;
};

export function ComponentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  async function refresh() {
    const [groupData, componentData] = await Promise.all([
      api<{ componentGroups: Group[] }>('/api/v1/componentGroups'),
      api<{ components: Component[] }>('/api/v1/components'),
    ]);
    setGroups(groupData.componentGroups);
    setComponents(componentData.components);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/v1/componentGroups', {
      method: 'POST',
      body: JSON.stringify({ displayName: form.get('displayName') }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function createComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/v1/components', {
      method: 'POST',
      body: JSON.stringify({
        displayName: form.get('displayName'),
        description: form.get('description') || undefined,
        group: form.get('group') || null,
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function remove(path: string) {
    await api(`/api/v1/${path}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <Stack gap={5}>
      <Text as="h1" tone="display">
        Components
      </Text>
      <Card>
        <form onSubmit={createGroup}>
          <Stack gap={3}>
            <Text as="h2" tone="title">
              Add a group
            </Text>
            <Field label="Display name" htmlFor="group-name">
              <Input id="group-name" name="displayName" required />
            </Field>
            <Button type="submit">Add group</Button>
          </Stack>
        </form>
      </Card>
      <Card>
        <form onSubmit={createComponent}>
          <Stack gap={3}>
            <Text as="h2" tone="title">
              Add a component
            </Text>
            <Field label="Display name" htmlFor="component-name">
              <Input id="component-name" name="displayName" required />
            </Field>
            <Field label="Description" htmlFor="component-description">
              <Textarea id="component-description" name="description" />
            </Field>
            <Field label="Group" htmlFor="component-group">
              <Select id="component-group" name="group" defaultValue="">
                <option value="">Ungrouped</option>
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.displayName}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit">Add component</Button>
          </Stack>
        </form>
      </Card>
      <Stack gap={3}>
        {components.map((component) => (
          <Card key={component.name}>
            <Stack direction="horizontal" gap={3}>
              <Text tone="title">{component.displayName}</Text>
              <StatusPill status={component.status} />
              <Button type="button" variant="ghost" onClick={() => remove(component.name)}>
                Delete
              </Button>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
