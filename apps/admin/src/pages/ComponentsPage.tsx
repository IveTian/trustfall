import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { ElementDragPayload } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import {
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  Button,
  Dialog,
  Field,
  Icon,
  IconButton,
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
  TreeEmpty,
  TreeList,
  TreeNest,
  TreeRow,
} from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Group = { id: string; display_name: string; description: string | null; position: number };
type Component = {
  id: string;
  display_name: string;
  description: string | null;
  status: ComponentStatus;
  group_id: string | null;
  position: number;
};

type DragData = { type: 'component' | 'group'; id: string };
type DropHint =
  | { kind: 'row'; id: string; edge: 'top' | 'bottom' | 'into' }
  // A list drop appends: `id` is the group, or 'root' for the ungrouped list.
  | { kind: 'list'; id: string };

function byPosition(a: { position: number; display_name: string }, b: typeof a) {
  return a.position - b.position || a.display_name.localeCompare(b.display_name);
}

/** Drag payloads cross pragmatic-dnd as untyped records; narrow before use. */
function asDragData(data: Record<string | symbol, unknown>): DragData | null {
  return (data.type === 'component' || data.type === 'group') && typeof data.id === 'string'
    ? { type: data.type, id: data.id }
    : null;
}

function sameHint(a: DropHint | null, b: DropHint | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.kind === b.kind &&
    a.id === b.id &&
    (a.kind !== 'row' || a.edge === (b as { edge: string }).edge)
  );
}

/** A component row: draggable by its handle, a drop target on its edges. */
function ComponentTreeRow({
  component,
  dragging,
  dropEdge,
  onEdit,
  onDelete,
}: {
  component: Component;
  dragging: boolean;
  dropEdge: 'top' | 'bottom' | 'into' | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const handle = handleRef.current;
    if (!row || !handle) {
      return;
    }
    return combine(
      draggable({
        element: row,
        dragHandle: handle,
        getInitialData: () => ({ type: 'component', id: component.id }),
      }),
      dropTargetForElements({
        element: row,
        canDrop: ({ source }) =>
          source.data.type === 'component' && source.data.id !== component.id,
        getData: ({ input, element }) =>
          attachClosestEdge(
            { type: 'component-row', id: component.id },
            { input, element, allowedEdges: ['top', 'bottom'] },
          ),
      }),
    );
  }, [component.id]);

  return (
    <TreeRow
      ref={rowRef}
      handleRef={handleRef}
      title={component.display_name}
      description={component.description}
      handle
      dragging={dragging}
      dropEdge={dropEdge}
      end={
        <>
          <StatusPill status={component.status} />
          <IconButton label={`Edit ${component.display_name}`} onClick={onEdit}>
            <Icon name="pencil-line" size={16} />
          </IconButton>
          <IconButton label={`Delete ${component.display_name}`} onClick={onDelete}>
            <Icon name="delete-bin-line" size={16} />
          </IconButton>
        </>
      }
    />
  );
}

/**
 * A group row: draggable among groups, and three drop targets in one — the
 * header takes a component ("into"), its edges take a group reorder, and the
 * nested list appends a component to the group.
 */
function GroupTreeRow({
  group,
  dragging,
  dropEdge,
  nestActive,
  onEdit,
  onDelete,
  children,
}: {
  group: Group;
  dragging: boolean;
  dropEdge: 'top' | 'bottom' | 'into' | null;
  nestActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const nestRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const handle = handleRef.current;
    const nest = nestRef.current;
    if (!row || !handle || !nest) {
      return;
    }
    return combine(
      draggable({
        element: row,
        dragHandle: handle,
        getInitialData: () => ({ type: 'group', id: group.id }),
      }),
      dropTargetForElements({
        element: row,
        canDrop: ({ source }) =>
          source.data.type === 'component' ||
          (source.data.type === 'group' && source.data.id !== group.id),
        getData: ({ input, element }) =>
          attachClosestEdge(
            { type: 'group-row', id: group.id },
            { input, element, allowedEdges: ['top', 'bottom'] },
          ),
      }),
      dropTargetForElements({
        element: nest,
        canDrop: ({ source }) => source.data.type === 'component',
        getData: () => ({ type: 'group-list', id: group.id }),
      }),
    );
  }, [group.id]);

  return (
    <TreeRow
      ref={rowRef}
      handleRef={handleRef}
      title={group.display_name}
      description={group.description}
      icon="folder-line"
      handle
      dragging={dragging}
      dropEdge={dropEdge}
      end={
        <>
          <IconButton label={`Edit ${group.display_name}`} onClick={onEdit}>
            <Icon name="pencil-line" size={16} />
          </IconButton>
          <IconButton label={`Delete ${group.display_name}`} onClick={onDelete}>
            <Icon name="delete-bin-line" size={16} />
          </IconButton>
        </>
      }
      nest={
        <TreeNest ref={nestRef} active={nestActive}>
          {children}
        </TreeNest>
      }
    />
  );
}

export function ComponentsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  // `null` means the first load has not landed yet; an empty array is a real
  // "no components" answer.
  const [components, setComponents] = useState<Component[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState<'component' | 'group' | null>(null);
  const [deleting, setDeleting] = useState<Component | null>(null);
  const [editing, setEditing] = useState<Component | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragData | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const rootRef = useRef<HTMLUListElement>(null);
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

  async function submitDialog(
    request: () => Promise<unknown>,
    doneMessage: string,
    close: () => void,
  ) {
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
    close();
    showToast(doneMessage);
    await refresh();
  }

  function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitDialog(
      () =>
        api('/api/component-groups', {
          method: 'POST',
          body: JSON.stringify({
            display_name: form.get('display_name'),
            description: form.get('description') || undefined,
          }),
        }),
      'Group added.',
      () => setCreating(null),
    );
  }

  function createComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void submitDialog(
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
      () => setCreating(null),
    );
  }

  function updateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingGroup) {
      return;
    }
    const form = new FormData(event.currentTarget);
    void submitDialog(
      () =>
        api(`/api/component-groups/${editingGroup.id}`, {
          method: 'PATCH',
          // An emptied description clears the field: PATCH treats null as
          // "remove", while an omitted property would leave it unchanged.
          body: JSON.stringify({
            display_name: form.get('display_name'),
            description: form.get('description') || null,
          }),
        }),
      'Group updated.',
      () => setEditingGroup(null),
    );
  }

  function updateComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    const form = new FormData(event.currentTarget);
    void submitDialog(
      () =>
        api(`/api/components/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            display_name: form.get('display_name'),
            description: form.get('description') || null,
            group_id: form.get('group_id') || null,
          }),
        }),
      'Component updated.',
      () => setEditing(null),
    );
  }

  async function confirmDeleteGroup() {
    if (!deletingGroup) {
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/component-groups/${deletingGroup.id}`, { method: 'DELETE' });
    } catch (err) {
      setSubmitting(false);
      setDeletingGroup(null);
      showToast(err instanceof Error ? err.message : 'Could not delete the group.');
      return;
    }
    setSubmitting(false);
    setDeletingGroup(null);
    showToast(`Deleted ${deletingGroup.display_name}.`);
    await refresh();
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

  // A component whose group vanished between loads still shows up: it lands in
  // the ungrouped list rather than disappearing from the console.
  function groupIdOf(component: Component): string | null {
    return groups.some((group) => group.id === component.group_id) ? component.group_id : null;
  }

  function membersOf(groupId: string | null): Component[] {
    return (components ?? []).filter((c) => groupIdOf(c) === groupId).sort(byPosition);
  }

  const sortedGroups = [...groups].sort(byPosition);
  const ungrouped = membersOf(null);
  const showList =
    loadError == null && components != null && (components.length > 0 || groups.length > 0);

  // --- Drag and drop ---------------------------------------------------------
  // Rows register themselves with pragmatic-dnd (see ComponentTreeRow /
  // GroupTreeRow); this monitor is the single place drops are interpreted.
  // Order is persisted by rewriting `position` to the row's index within its
  // list; a cross-list move also rewrites the component's `group_id`. State is
  // updated optimistically, then every changed row is PATCHed and the page
  // refreshed so a failed write cannot leave a phantom order behind.

  function persistOrder(requests: Array<() => Promise<unknown>>) {
    if (requests.length === 0) {
      return;
    }
    void (async () => {
      try {
        await Promise.all(requests.map((request) => request()));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Could not save the new order.');
      } finally {
        await refresh();
      }
    })();
  }

  function moveComponent(componentId: string, destGroupId: string | null, index: number) {
    const moved = (components ?? []).find((c) => c.id === componentId);
    if (!moved) {
      return;
    }
    const siblings = membersOf(destGroupId).filter((c) => c.id !== componentId);
    siblings.splice(Math.min(index, siblings.length), 0, { ...moved, group_id: destGroupId });

    const changes = new Map<string, { group_id: string | null; position: number }>();
    siblings.forEach((c, i) => {
      const original = c.id === componentId ? moved : c;
      if (original.position !== i || groupIdOf(original) !== destGroupId) {
        changes.set(c.id, { group_id: destGroupId, position: i });
      }
    });
    if (changes.size === 0) {
      return;
    }

    setComponents(
      (prev) =>
        prev?.map((c) => {
          const change = changes.get(c.id);
          return change ? { ...c, ...change } : c;
        }) ?? prev,
    );
    persistOrder(
      [...changes].map(
        ([id, change]) =>
          () =>
            api(`/api/components/${id}`, { method: 'PATCH', body: JSON.stringify(change) }),
      ),
    );
  }

  function moveGroup(groupId: string, index: number) {
    const moved = groups.find((g) => g.id === groupId);
    if (!moved) {
      return;
    }
    const siblings = sortedGroups.filter((g) => g.id !== groupId);
    siblings.splice(Math.min(index, siblings.length), 0, moved);

    const changes = new Map<string, { position: number }>();
    siblings.forEach((g, i) => {
      if (g.position !== i) {
        changes.set(g.id, { position: i });
      }
    });
    if (changes.size === 0) {
      return;
    }

    setGroups((prev) =>
      prev.map((g) => {
        const change = changes.get(g.id);
        return change ? { ...g, ...change } : g;
      }),
    );
    persistOrder(
      [...changes].map(
        ([id, change]) =>
          () =>
            api(`/api/component-groups/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(change),
            }),
      ),
    );
  }

  // The root list appends a dragged component to the ungrouped rows.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    return dropTargetForElements({
      element: el,
      canDrop: ({ source }) => source.data.type === 'component',
      getData: () => ({ type: 'root-list' }),
    });
  }, [showList]);

  useEffect(() => {
    function hintFrom(source: ElementDragPayload, location: DragLocationHistory): DropHint | null {
      const target = location.current.dropTargets[0];
      const src = asDragData(source.data);
      if (!target || !src) {
        return null;
      }
      const data = target.data;
      if (data.type === 'component-row' && typeof data.id === 'string') {
        const edge = extractClosestEdge(data);
        return { kind: 'row', id: data.id, edge: edge === 'top' ? 'top' : 'bottom' };
      }
      if (data.type === 'group-row' && typeof data.id === 'string') {
        if (src.type === 'component') {
          return { kind: 'row', id: data.id, edge: 'into' };
        }
        const edge = extractClosestEdge(data);
        return { kind: 'row', id: data.id, edge: edge === 'top' ? 'top' : 'bottom' };
      }
      if (data.type === 'group-list' && typeof data.id === 'string') {
        return { kind: 'list', id: data.id };
      }
      if (data.type === 'root-list') {
        return { kind: 'list', id: 'root' };
      }
      return null;
    }

    function updateHint(source: ElementDragPayload, location: DragLocationHistory) {
      const next = hintFrom(source, location);
      setDropHint((prev) => (sameHint(prev, next) ? prev : next));
    }

    return monitorForElements({
      onDragStart: ({ source }) => setDragItem(asDragData(source.data)),
      onDrag: ({ source, location }) => updateHint(source, location),
      onDropTargetChange: ({ source, location }) => updateHint(source, location),
      onDrop: ({ source, location }) => {
        const hint = hintFrom(source, location);
        const src = asDragData(source.data);
        setDragItem(null);
        setDropHint(null);
        if (!hint || !src) {
          return;
        }
        if (src.type === 'component') {
          if (hint.kind === 'list') {
            const destGroupId = hint.id === 'root' ? null : hint.id;
            moveComponent(src.id, destGroupId, membersOf(destGroupId).length);
          } else if (hint.edge === 'into') {
            moveComponent(src.id, hint.id, membersOf(hint.id).length);
          } else {
            const target = (components ?? []).find((c) => c.id === hint.id);
            if (!target) {
              return;
            }
            const destGroupId = groupIdOf(target);
            const siblings = membersOf(destGroupId).filter((c) => c.id !== src.id);
            const at = siblings.findIndex((c) => c.id === target.id);
            moveComponent(src.id, destGroupId, hint.edge === 'bottom' ? at + 1 : at);
          }
        } else if (hint.kind === 'row' && hint.edge !== 'into') {
          const siblings = sortedGroups.filter((g) => g.id !== src.id);
          const at = siblings.findIndex((g) => g.id === hint.id);
          moveGroup(src.id, hint.edge === 'bottom' ? at + 1 : at);
        }
      },
    });
  });

  function hintFor(id: string): 'top' | 'bottom' | 'into' | null {
    return dropHint?.kind === 'row' && dropHint.id === id ? dropHint.edge : null;
  }

  function renderComponent(component: Component) {
    return (
      <ComponentTreeRow
        key={component.id}
        component={component}
        dragging={dragItem?.type === 'component' && dragItem.id === component.id}
        dropEdge={hintFor(component.id)}
        onEdit={() => {
          setFormError(null);
          setEditing(component);
        }}
        onDelete={() => setDeleting(component)}
      />
    );
  }

  return (
    <>
      <PageHeader
        icon="stack-fill"
        trail={['Components']}
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
          ) : !showList ? (
            <Text tone="muted">
              No components yet. Add the services this status page reports on.
            </Text>
          ) : (
            <TreeList ref={rootRef} active={dropHint?.kind === 'list' && dropHint.id === 'root'}>
              {ungrouped.map(renderComponent)}
              {sortedGroups.map((group) => {
                const members = membersOf(group.id);
                return (
                  <GroupTreeRow
                    key={group.id}
                    group={group}
                    dragging={dragItem?.type === 'group' && dragItem.id === group.id}
                    dropEdge={hintFor(group.id)}
                    nestActive={dropHint?.kind === 'list' && dropHint.id === group.id}
                    onEdit={() => {
                      setFormError(null);
                      setEditingGroup(group);
                    }}
                    onDelete={() => setDeletingGroup(group)}
                  >
                    {members.length === 0 ? (
                      <TreeEmpty>No components in this group yet.</TreeEmpty>
                    ) : (
                      members.map(renderComponent)
                    )}
                  </GroupTreeRow>
                );
              })}
            </TreeList>
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
                  <Input id="group-name" name="display_name" required disabled={submitting} />
                </Field>
                <Field label="Description" htmlFor="group-description">
                  <Textarea id="group-description" name="description" disabled={submitting} />
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
                  <Input id="component-name" name="display_name" required disabled={submitting} />
                </Field>
                <Field label="Description" htmlFor="component-description">
                  <Textarea id="component-description" name="description" disabled={submitting} />
                </Field>
                <Field label="Group" htmlFor="component-group">
                  <Select
                    id="component-group"
                    name="group_id"
                    defaultValue=""
                    disabled={submitting}
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
            open={editingGroup != null}
            title="Edit group"
            onClose={() => setEditingGroup(null)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" form="edit-group" loading={submitting} loadingLabel="Saving">
                  Save
                </Button>
              </>
            }
          >
            <form id="edit-group" key={editingGroup?.id} onSubmit={updateGroup}>
              <Stack gap={3}>
                <Field label="Display name" htmlFor="edit-group-name">
                  <Input
                    id="edit-group-name"
                    name="display_name"
                    defaultValue={editingGroup?.display_name}
                    required
                    disabled={submitting}
                  />
                </Field>
                <Field label="Description" htmlFor="edit-group-description">
                  <Textarea
                    id="edit-group-description"
                    name="description"
                    defaultValue={editingGroup?.description ?? ''}
                    disabled={submitting}
                  />
                </Field>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Dialog
            open={editing != null}
            title="Edit component"
            onClose={() => setEditing(null)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-component"
                  loading={submitting}
                  loadingLabel="Saving"
                >
                  Save
                </Button>
              </>
            }
          >
            <form id="edit-component" key={editing?.id} onSubmit={updateComponent}>
              <Stack gap={3}>
                <Field label="Display name" htmlFor="edit-component-name">
                  <Input
                    id="edit-component-name"
                    name="display_name"
                    defaultValue={editing?.display_name}
                    required
                    disabled={submitting}
                  />
                </Field>
                <Field label="Description" htmlFor="edit-component-description">
                  <Textarea
                    id="edit-component-description"
                    name="description"
                    defaultValue={editing?.description ?? ''}
                    disabled={submitting}
                  />
                </Field>
                <Field label="Group" htmlFor="edit-component-group">
                  <Select
                    id="edit-component-group"
                    name="group_id"
                    defaultValue={
                      editing != null && groups.some((group) => group.id === editing.group_id)
                        ? (editing.group_id ?? '')
                        : ''
                    }
                    disabled={submitting}
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
            open={deletingGroup != null}
            title="Delete group?"
            onClose={() => setDeletingGroup(null)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setDeletingGroup(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={submitting}
                  loadingLabel="Deleting"
                  onClick={() => void confirmDeleteGroup()}
                >
                  Delete
                </Button>
              </>
            }
          >
            <Text>
              {`${deletingGroup?.display_name ?? 'This group'} goes away, but its components stay and become ungrouped.`}
            </Text>
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
