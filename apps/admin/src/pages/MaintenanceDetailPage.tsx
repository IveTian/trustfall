import {
  Button,
  componentStatusPresentation,
  describeRecurrence,
  Dialog,
  Field,
  formatDuration,
  formatInstant,
  formatWindow,
  Icon,
  IncidentTimeline,
  Menu,
  PageBody,
  PageHeader,
  RelativeTime,
  RichTextEditor,
  Skeleton,
  Stack,
  StatusIcon,
  StatusPill,
  Text,
  Toast,
  TreeList,
  TreeRow,
} from '@trustfall/design';
import type { ComponentStatus, MaintenanceStatus } from '@trustfall/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import type { AffectedComponent, AffectedGroup } from '../components/AffectedComponentsField.tsx';
import {
  MaintenanceForm,
  type ScheduleLock,
  type ScheduleValue,
} from '../components/MaintenanceForm.tsx';
import {
  announcementOf,
  type Maintenance,
  type MaintenancePayload,
  toRecurrence,
} from '../lib/maintenance.ts';
import { useToast } from '../lib/toast.ts';

/** The one-shot transitions an operator makes by hand, with their confirm copy. */
const TRANSITIONS: Record<
  'start' | 'complete' | 'cancel',
  {
    status: MaintenanceStatus;
    title: string;
    verb: string;
    loading: string;
    done: string;
    hint: string;
  }
> = {
  start: {
    status: 'IN_PROGRESS',
    title: 'Start maintenance now?',
    verb: 'Start now',
    loading: 'Starting',
    done: 'Maintenance started.',
    hint: 'The window opens right away and its components go under maintenance. The planned end stays where it is.',
  },
  complete: {
    status: 'COMPLETED',
    title: 'Complete maintenance?',
    verb: 'Complete',
    loading: 'Completing',
    done: 'Maintenance completed.',
    hint: 'The window closes now and its components return to operational. A recurring maintenance moves on to its next window.',
  },
  cancel: {
    status: 'CANCELLED',
    title: 'Cancel maintenance?',
    verb: 'Cancel maintenance',
    loading: 'Cancelling',
    done: 'Maintenance cancelled.',
    hint: 'Readers see it called off. A recurring maintenance stops for good, and any window under way closes.',
  },
};

type Transition = keyof typeof TRANSITIONS;

function scheduleFrom(maintenance: Maintenance): ScheduleValue {
  const recurrence = toRecurrence(maintenance.schedule.recurrence);
  return {
    mode: recurrence ? 'RECURRING' : 'SCHEDULED',
    startsAt: Date.parse(maintenance.schedule.starts_at),
    durationMinutes: maintenance.schedule.duration_minutes,
    frequency: recurrence?.frequency ?? 'WEEKLY',
    interval: recurrence?.interval ?? 1,
    byWeekday: recurrence?.byWeekday ?? [],
    until: recurrence?.until ?? null,
    componentIds: new Set(maintenance.affected_components.map((item) => item.component_id)),
  };
}

function lockFor(status: MaintenanceStatus): ScheduleLock {
  return status === 'SCHEDULED' ? 'none' : status === 'IN_PROGRESS' ? 'in-progress' : 'finished';
}

export function MaintenanceDetailPage() {
  const { maintenanceId } = useParams();
  const navigate = useNavigate();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  // With their live status: a component an incident has degraded keeps
  // that status through a window, and the page must say so.
  const [components, setComponents] = useState<
    Array<AffectedComponent & { status: ComponentStatus }>
  >([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [noting, setNoting] = useState(false);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const backTrail = { label: 'Maintenance', onSelect: () => navigate('/maintenance') };

  const refresh = useCallback(async () => {
    if (!maintenanceId) {
      return;
    }
    try {
      const [loaded, componentPage, groupPage] = await Promise.all([
        api<Maintenance>(`/api/maintenances/${maintenanceId}`),
        api<Page<AffectedComponent & { status: ComponentStatus }>>('/api/components'),
        api<Page<AffectedGroup>>('/api/component-groups'),
      ]);
      setMaintenance(loaded);
      setComponents(componentPage.items);
      setGroups(groupPage.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the maintenance.');
    }
  }, [maintenanceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function postUpdate(body: { status: MaintenanceStatus; body?: string }): Promise<boolean> {
    if (!maintenanceId) {
      return false;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api(`/api/maintenances/${maintenanceId}/updates`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not post the update.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function runTransition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!transition) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const message = String(form.get('body') ?? '').trim();
    const spec = TRANSITIONS[transition];
    const posted = await postUpdate({ status: spec.status, ...(message ? { body: message } : {}) });
    if (!posted) {
      return;
    }
    setTransition(null);
    showToast(spec.done);
    await refresh();
  }

  async function postNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!maintenance) {
      return;
    }
    const form = new FormData(event.currentTarget);
    const message = String(form.get('body') ?? '').trim();
    if (!message) {
      setFormError('Message is required.');
      return;
    }
    const posted = await postUpdate({ status: maintenance.status, body: message });
    if (!posted) {
      return;
    }
    setNoting(false);
    showToast('Update published.');
    await refresh();
  }

  async function saveEdit(payload: MaintenancePayload) {
    if (!maintenanceId) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api(`/api/maintenances/${maintenanceId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the maintenance.');
      return;
    } finally {
      setSubmitting(false);
    }
    setEditing(false);
    showToast('Maintenance saved.');
    await refresh();
  }

  async function deleteMaintenance() {
    if (!maintenanceId) {
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/maintenances/${maintenanceId}`, { method: 'DELETE' });
    } catch (err) {
      setSubmitting(false);
      setConfirmingDelete(false);
      showToast(err instanceof Error ? err.message : 'Could not delete the maintenance.');
      return;
    }
    setSubmitting(false);
    showToast('Maintenance deleted.');
    navigate('/maintenance');
  }

  function openDialog(open: () => void) {
    setFormError(null);
    open();
  }

  if (loadError != null) {
    return (
      <>
        <PageHeader icon="hammer-fill" trail={[backTrail, 'Details']} />
        <PageBody>
          <Stack gap={3} align="start">
            <Text tone="muted">{loadError}</Text>
            <Button variant="secondary" onClick={() => void refresh()}>
              Retry
            </Button>
          </Stack>
        </PageBody>
      </>
    );
  }

  if (!maintenance) {
    return (
      <>
        <PageHeader icon="hammer-fill" trail={[backTrail, 'Details']} />
        <PageBody>
          <Stack gap={3}>
            <Skeleton label="Loading maintenance" />
            <Skeleton label="Loading maintenance" />
          </Stack>
        </PageBody>
      </>
    );
  }

  const active = maintenance.status === 'SCHEDULED' || maintenance.status === 'IN_PROGRESS';
  const zone = maintenance.schedule.time_zone;
  const recurrence = toRecurrence(maintenance.schedule.recurrence);
  const windowStart = Date.parse(maintenance.starts_at);
  const windowEnd = Date.parse(maintenance.ends_at);
  // A window started by hand keeps its planned start; the entry that opened
  // it says when it really began.
  const openedAt = maintenance.updates.find((update) => update.status === 'IN_PROGRESS');
  const underWaySince = openedAt ? Date.parse(openedAt.created_at) : windowStart;
  const timelineUpdates = maintenance.updates.map((update) => ({
    id: update.id,
    status: update.status,
    body: update.body,
    createTime: Date.parse(update.created_at),
    ...(update.automatic ? { note: 'Automatic' } : {}),
  }));
  const liveStatus = (componentId: string): ComponentStatus =>
    components.find((component) => component.id === componentId)?.status ?? 'OPERATIONAL';

  const menuItems = [
    ...(active
      ? [
          {
            id: 'cancel',
            label: 'Cancel maintenance',
            icon: <Icon name="close-circle-line" size={16} />,
            onSelect: () => openDialog(() => setTransition('cancel')),
          },
        ]
      : []),
    {
      id: 'delete',
      label: 'Delete maintenance',
      icon: <Icon name="delete-bin-line" size={16} />,
      onSelect: () => setConfirmingDelete(true),
    },
  ];

  return (
    <>
      <PageHeader
        icon="hammer-fill"
        trail={[backTrail, maintenance.title]}
        actions={
          <>
            <Menu label="More actions" variant="icon" items={menuItems}>
              <Icon name="more-line" size={16} />
            </Menu>
            <Button
              variant="secondary"
              startEnhancer={<Icon name="pencil-line" size={16} />}
              onClick={() => openDialog(() => setEditing(true))}
            >
              Edit
            </Button>
            <Button variant="secondary" onClick={() => openDialog(() => setNoting(true))}>
              Post update
            </Button>
            {maintenance.status === 'SCHEDULED' ? (
              <Button
                startEnhancer={<Icon name="play-line" size={16} />}
                onClick={() => openDialog(() => setTransition('start'))}
              >
                Start now
              </Button>
            ) : maintenance.status === 'IN_PROGRESS' ? (
              <Button
                startEnhancer={<Icon name="check-double-line" size={16} />}
                onClick={() => openDialog(() => setTransition('complete'))}
              >
                Complete
              </Button>
            ) : null}
          </>
        }
      />
      <PageBody>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text as="h2" tone="display">
              {maintenance.title}
            </Text>
            <Stack direction="horizontal" gap={2} wrap>
              <StatusPill status={maintenance.status} kind="maintenance" />
            </Stack>
            <Stack gap={1}>
              <Text tone="caption">
                {maintenance.status === 'IN_PROGRESS' ? (
                  <>
                    Under way since {formatInstant(underWaySince, zone)} · ends{' '}
                    <RelativeTime value={windowEnd} />
                  </>
                ) : maintenance.status === 'SCHEDULED' ? (
                  <>
                    Next window {formatWindow(windowStart, windowEnd, zone)} · starts{' '}
                    <RelativeTime value={windowStart} />
                  </>
                ) : (
                  <>Last window {formatWindow(windowStart, windowEnd, zone)}</>
                )}
              </Text>
              <Text tone="caption">
                {recurrence
                  ? describeRecurrence(recurrence, Date.parse(maintenance.schedule.starts_at), zone)
                  : `One-off · ${formatDuration(maintenance.schedule.duration_minutes * 60_000)}`}
              </Text>
              {maintenance.next_windows.length > 0 ? (
                <Text tone="caption">
                  Then{' '}
                  {maintenance.next_windows
                    .map((window) =>
                      formatWindow(Date.parse(window.starts_at), Date.parse(window.ends_at), zone),
                    )
                    .join(' · ')}
                </Text>
              ) : null}
            </Stack>
          </Stack>

          <Stack gap={4}>
            <Text as="h2" tone="label">
              Updates
            </Text>
            <IncidentTimeline kind="maintenance" updates={timelineUpdates} />
          </Stack>

          <Stack gap={4}>
            <Stack direction="horizontal" justify="between" gap={3}>
              <Text as="h2" tone="label">
                Affected components
              </Text>
              {active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  startEnhancer={<Icon name="pencil-line" size={16} />}
                  onClick={() => openDialog(() => setEditing(true))}
                >
                  Edit
                </Button>
              ) : null}
            </Stack>
            {maintenance.affected_components.length === 0 ? (
              <Text tone="muted">
                No components are in this window.
                {active ? ' Edit to add the ones it touches.' : ''}
              </Text>
            ) : (
              <TreeList>
                {maintenance.affected_components.map((item) => {
                  const presentation = componentStatusPresentation[liveStatus(item.component_id)];
                  return (
                    <TreeRow
                      key={item.component_id}
                      title={item.display_name}
                      end={
                        maintenance.status === 'IN_PROGRESS' ? (
                          <>
                            <StatusIcon
                              icon={presentation.icon}
                              tone={presentation.tone}
                              title={presentation.label}
                            />
                            <Text tone="caption" as="span">
                              {presentation.label}
                            </Text>
                          </>
                        ) : undefined
                      }
                    />
                  );
                })}
              </TreeList>
            )}
          </Stack>

          <Dialog
            open={editing}
            title="Edit maintenance"
            onClose={() => setEditing(false)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-maintenance"
                  loading={submitting}
                  loadingLabel="Saving"
                >
                  Save
                </Button>
              </>
            }
          >
            <MaintenanceForm
              formId="edit-maintenance"
              initial={scheduleFrom(maintenance)}
              initialTitle={maintenance.title}
              initialBody={announcementOf(maintenance)?.body ?? ''}
              components={components}
              groups={groups}
              lock={lockFor(maintenance.status)}
              disabled={submitting}
              onSubmit={(payload) => void saveEdit(payload)}
            />
            {formError != null ? <Text tone="caption">{formError}</Text> : null}
          </Dialog>

          <Dialog
            open={noting}
            title="Post update"
            onClose={() => setNoting(false)}
            closeable={!submitting}
            actions={
              <>
                <Button variant="secondary" disabled={submitting} onClick={() => setNoting(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="maintenance-note"
                  loading={submitting}
                  loadingLabel="Publishing"
                >
                  Publish update
                </Button>
              </>
            }
          >
            <form id="maintenance-note" onSubmit={postNote}>
              <Stack gap={3}>
                <Field label="Message" htmlFor="note-body">
                  <RichTextEditor id="note-body" name="body" disabled={submitting} />
                </Field>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Dialog
            open={transition != null}
            title={transition ? TRANSITIONS[transition].title : ''}
            onClose={() => setTransition(null)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setTransition(null)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  form="maintenance-transition"
                  variant={transition === 'cancel' ? 'danger' : 'primary'}
                  loading={submitting}
                  loadingLabel={transition ? TRANSITIONS[transition].loading : undefined}
                >
                  {transition ? TRANSITIONS[transition].verb : ''}
                </Button>
              </>
            }
          >
            <form id="maintenance-transition" onSubmit={runTransition}>
              <Stack gap={3}>
                <Text>{transition ? TRANSITIONS[transition].hint : ''}</Text>
                <Field
                  label="Message"
                  htmlFor="transition-body"
                  hint="Optional. Left blank, the timeline gets a stock line."
                >
                  <RichTextEditor id="transition-body" name="body" disabled={submitting} />
                </Field>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Dialog
            open={confirmingDelete}
            title="Delete maintenance?"
            onClose={() => setConfirmingDelete(false)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setConfirmingDelete(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={submitting}
                  loadingLabel="Deleting"
                  onClick={() => void deleteMaintenance()}
                >
                  Delete
                </Button>
              </>
            }
          >
            <Text>
              The maintenance and its whole timeline disappear from the status page immediately. A
              window under way returns its components to operational. This cannot be undone.
            </Text>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
