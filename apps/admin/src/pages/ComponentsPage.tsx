import {
  Button,
  Card,
  Field,
  Input,
  PageBody,
  PageHeader,
  Select,
  Stack,
  StatusPill,
  Text,
  Textarea,
} from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { api, type Page } from '../lib/api.ts';

type Group = { id: string; display_name: string };
type Component = {
  id: string;
  display_name: string;
  description: string | null;
  status: ComponentStatus;
  group_id: string | null;
};

export function ComponentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  async function refresh() {
    const [groupPage, componentPage] = await Promise.all([
      api<Page<Group>>('/api/component-groups'),
      api<Page<Component>>('/api/components'),
    ]);
    setGroups(groupPage.items);
    setComponents(componentPage.items);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/component-groups', {
      method: 'POST',
      body: JSON.stringify({ display_name: form.get('display_name') }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function createComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api('/api/components', {
      method: 'POST',
      body: JSON.stringify({
        display_name: form.get('display_name'),
        description: form.get('description') || undefined,
        group_id: form.get('group_id') || null,
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function removeComponent(componentId: string) {
    await api(`/api/components/${componentId}`, { method: 'DELETE' });
    await refresh();
  }

  return (
    <>
      <PageHeader icon="stack-fill" trail={['Status', 'Components']} />
      <PageBody>
        <Stack gap={5}>
          <Card>
            <form onSubmit={createGroup}>
              <Stack gap={3}>
                <Text as="h2" tone="title">
                  Add a group
                </Text>
                <Field label="Display name" htmlFor="group-name">
                  <Input id="group-name" name="display_name" required />
                </Field>
                <Stack direction="horizontal" gap={2}>
                  <Button type="submit">Add group</Button>
                </Stack>
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
                  <Input id="component-name" name="display_name" required />
                </Field>
                <Field label="Description" htmlFor="component-description">
                  <Textarea id="component-description" name="description" />
                </Field>
                <Field label="Group" htmlFor="component-group">
                  <Select id="component-group" name="group_id" defaultValue="">
                    <option value="">Ungrouped</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.display_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Stack direction="horizontal" gap={2}>
                  <Button type="submit">Add component</Button>
                </Stack>
              </Stack>
            </form>
          </Card>
          <Stack gap={3}>
            {components.map((component) => (
              <Card key={component.id}>
                <Stack direction="horizontal" gap={3}>
                  <Text tone="title">{component.display_name}</Text>
                  <StatusPill status={component.status} />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeComponent(component.id)}
                  >
                    Delete
                  </Button>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
      </PageBody>
    </>
  );
}
