import {
  Button,
  Card,
  Dialog,
  Field,
  Input,
  PageBody,
  PageHeader,
  Select,
  Skeleton,
  Stack,
  StatusPill,
  Text,
  Textarea,
  Toast,
} from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

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
  // `null` means the first load has not landed yet; an empty array is a real
  // "no components" answer.
  const [components, setComponents] = useState<Component[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState<'component' | 'group' | null>(null);
  const [deleting, setDeleting] = useState<Component | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [groupPage, componentPage] = await Promise.all([
        api<Page<Group>>('/api/component-groups'),
        api<Page<Component>>('/api/components'),
      ]);
      setGroups(groupPage.items);
      setComponents(componentPage.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load components.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate(kind: 'component' | 'group') {
    setFormError(null);
    setCreating(kind);
  }

  async function submitCreate(request: () => Promise<unknown>, doneMessage: string) {
    setSubmitting(true);
    setFormError(null);
    try {
      await request();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save.');
      return;
    } finally {
      setSubmitting(false);
    }
    // Closing unmounts the dialog form, so the next open starts blank.
    setCreating(null);
    showToast(doneMessage);
    await refresh();
  }

  function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitCreate(
      () =>
        api('/api/component-groups', {
          method: 'POST',
          body: JSON.stringify({ display_name: form.get('display_name') }),
        }),
      'Group added.',
    );
  }

  function createComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitCreate(
      () =>
        api('/api/components', {
          method: 'POST',
          body: JSON.stringify({
            display_name: form.get('display_name'),
            description: form.get('description') || undefined,
            group_id: form.get('group_id') || null,
          }),
        }),
      'Component added.',
    );
  }

  async function confirmDelete() {
    if (!deleting) {
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/components/${deleting.id}`, { method: 'DELETE' });
    } catch (err) {
      setSubmitting(false);
      setDeleting(null);
      showToast(err instanceof Error ? err.message : 'Could not delete the component.');
      return;
    }
    setSubmitting(false);
    setDeleting(null);
    showToast(`Deleted ${deleting.display_name}.`);
    await refresh();
  }

  return (
    <>
      <PageHeader
        icon="stack-fill"
        trail={['Status', 'Components']}
        actions={
          <>
            <Button variant="secondary" onClick={() => openCreate('group')}>
              New group
            </Button>
            <Button onClick={() => openCreate('component')}>New component</Button>
          </>
        }
      />
      <PageBody>
        <Stack gap={5}>
          {loadError != null ? (
            <Stack gap={3} align="start">
              <Text tone="muted">{loadError}</Text>
              <Button variant="secondary" onClick={() => void refresh()}>
                Retry
              </Button>
            </Stack>
          ) : components == null ? (
            <Stack gap={3}>
              <Skeleton label="Loading components" />
              <Skeleton label="Loading components" />
            </Stack>
          ) : components.length === 0 ? (
            <Text tone="muted">
              No components yet. Add the services this status page reports on.
            </Text>
          ) : (
            <Stack gap={3}>
              {components.map((component) => (
                <Card key={component.id}>
                  <Stack direction="horizontal" gap={3}>
                    <Stack direction="horizontal" gap={3} grow>
                      <Text tone="title">{component.display_name}</Text>
                      <StatusPill status={component.status} />
                    </Stack>
                    <Button type="button" variant="ghost" onClick={() => setDeleting(component)}>
                      Delete
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          )}

          <Dialog
            open={creating === 'group'}
            title="Add a group"
            onClose={() => setCreating(null)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setCreating(null)}>
                  Cancel
                </Button>
                <Button type="submit" form="new-group" loading={submitting} loadingLabel="Adding">
                  Add group
                </Button>
              </>
            }
          >
            <form id="new-group" onSubmit={createGroup}>
              <Stack gap={3}>
                <Field label="Display name" htmlFor="group-name">
                  <Input id="group-name" name="display_name" required />
                </Field>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Dialog
            open={creating === 'component'}
            title="Add a component"
            onClose={() => setCreating(null)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setCreating(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="new-component"
                  loading={submitting}
                  loadingLabel="Adding"
                >
                  Add component
                </Button>
              </>
            }
          >
            <form id="new-component" onSubmit={createComponent}>
              <Stack gap={3}>
                <Field label="Display name" htmlFor="component-name">
                  <Input id="component-name" name="display_name" required />
                </Field>
                <Field label="Description" htmlFor="component-description">
                  <Textarea id="component-description" name="description" />
                </Field>
                <Field label="Group" htmlFor="component-group">
                  <Select
                    id="component-group"
                    name="group_id"
                    defaultValue=""
                    options={[
                      { value: '', label: 'Ungrouped' },
                      ...groups.map((group) => ({
                        value: group.id,
                        label: group.display_name,
                      })),
                    ]}
                  />
                </Field>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Dialog
            open={deleting != null}
            title="Delete component?"
            onClose={() => setDeleting(null)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setDeleting(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={submitting}
                  loadingLabel="Deleting"
                  onClick={() => void confirmDelete()}
                >
                  Delete
                </Button>
              </>
            }
          >
            <Text>
              {`${deleting?.display_name ?? 'This component'} disappears from the status page immediately. This cannot be undone.`}
            </Text>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
