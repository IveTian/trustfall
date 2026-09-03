import {
  Button,
  describeRecurrence,
  Dialog,
  formatDuration,
  formatWindow,
  PageBody,
  PageHeader,
  RichTextBody,
  Skeleton,
  Stack,
  StatusPill,
  Text,
  Toast,
  TreeList,
  TreeRow,
} from '@trustfall/design';
import { upcomingWindows } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, apiAll } from '../lib/api.ts';
import type { AffectedComponent, AffectedGroup } from '../components/AffectedComponentsField.tsx';
import {
  defaultSchedule,
  MaintenanceForm,
  type MaintenanceDraft,
} from '../components/MaintenanceForm.tsx';
import { MaintenanceSummaryCard } from '../components/MaintenanceSummaryCard.tsx';
import type { Maintenance, MaintenancePayload } from '../lib/maintenance.ts';
import { useToast } from '../lib/toast.ts';

/** The review step's account of when the windows run, as of `now`. */
export function DraftSchedule({ draft, now }: { draft: MaintenanceDraft; now: number }) {
  const durationMs = draft.durationMinutes * 60_000;
  if (draft.mode === 'NOW' || draft.startsAt == null) {
    return <Text>Starts now and runs for {formatDuration(durationMs)}.</Text>;
  }
  const windows = upcomingWindows(
    {
      startTime: draft.startsAt,
      endTime: draft.startsAt + durationMs,
      recurrence: draft.recurrence,
      timeZone: draft.timeZone,
    },
    now,
    { limit: draft.recurrence ? 4 : 1 },
  );
  return (
    <Stack gap={2}>
      {draft.recurrence ? (
        <Text>{describeRecurrence(draft.recurrence, draft.startsAt, draft.timeZone)}</Text>
      ) : null}
      <Stack gap={1}>
        {windows.map((window) => (
          <Text key={window.start} tone="caption">
            {formatWindow(window.start, window.end, draft.timeZone)}
          </Text>
        ))}
        {draft.recurrence && windows.length === 4 ? <Text tone="caption">…</Text> : null}
      </Stack>
    </Stack>
  );
}

function reviewedNow(): number {
  return Date.now();
}

export function MaintenancePage() {
  const navigate = useNavigate();
  // `null` means the first load has not landed yet; an empty array is a real
  // "nothing scheduled" answer.
  const [maintenances, setMaintenances] = useState<Maintenance[] | null>(null);
  const [components, setComponents] = useState<AffectedComponent[]>([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Scheduling is two steps: fill the form, review what readers will see,
  // then publish. The form stays mounted (hidden) during review so Back
  // returns to it untouched.
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draft, setDraft] = useState<{
    payload: MaintenancePayload;
    view: MaintenanceDraft;
    /** When review opened: the "now" its window list is read from. */
    reviewedAt: number;
  } | null>(null);
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [allMaintenances, allComponents, allGroups] = await Promise.all([
        apiAll<Maintenance>('/api/maintenances'),
        apiAll<AffectedComponent>('/api/components'),
        apiAll<AffectedGroup>('/api/component-groups'),
      ]);
      setMaintenances(allMaintenances);
      setComponents(allComponents);
      setGroups(allGroups);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load maintenance.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setFormError(null);
    setStep('edit');
    setDraft(null);
    setCreating(true);
  }

  async function publish() {
    if (!draft) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // "Start now" means the moment of publishing, which the server knows
    // better than the form did when it was reviewed.
    const { starts_at: _startsAt, ...rest } = draft.payload;
    const payload = draft.view.mode === 'NOW' ? rest : draft.payload;
    try {
      await api('/api/maintenances', { method: 'POST', body: JSON.stringify(payload) });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not schedule the maintenance.');
      return;
    } finally {
      setSubmitting(false);
    }
    // Closing unmounts the dialog form, so the next open starts blank.
    setCreating(false);
    showToast('Maintenance scheduled.');
    await refresh();
  }

  const underWay = (maintenances ?? []).filter((item) => item.status === 'IN_PROGRESS');
  const upcoming = (maintenances ?? [])
    .filter((item) => item.status === 'SCHEDULED')
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const past = (maintenances ?? []).filter(
    (item) => item.status === 'COMPLETED' || item.status === 'CANCELLED',
  );

  function section(title: string, items: Maintenance[], empty: string) {
    return (
      <Stack gap={3}>
        <Text as="h2" tone="label">
          {title}
        </Text>
        {items.length === 0 ? (
          <Text tone="muted">{empty}</Text>
        ) : (
          items.map((item) => (
            <MaintenanceSummaryCard
              key={item.id}
              maintenance={item}
              onOpen={() => navigate(`/maintenance/${item.id}`)}
            />
          ))
        )}
      </Stack>
    );
  }

  const affectedNames = (view: MaintenanceDraft) =>
    view.componentIds
      .map((id) => components.find((component) => component.id === id)?.display_name)
      .filter((name): name is string => name != null);

  return (
    <>
      <PageHeader
        icon="hammer-fill"
        trail={['Maintenance']}
        actions={<Button onClick={openCreate}>Schedule maintenance</Button>}
      />
      <PageBody>
        <Stack gap={6}>
          {loadError != null ? (
            <Stack gap={3} align="start">
              <Text tone="muted">{loadError}</Text>
              <Button variant="secondary" onClick={() => void refresh()}>
                Retry
              </Button>
            </Stack>
          ) : maintenances == null ? (
            <Stack gap={3}>
              <Skeleton label="Loading maintenance" />
              <Skeleton label="Loading maintenance" />
            </Stack>
          ) : (
            <>
              {underWay.length > 0 ? section('Under way', underWay, '') : null}
              {section(
                'Upcoming',
                upcoming,
                'Nothing scheduled. Plan a window and it shows on the status page ahead of time.',
              )}
              {past.length > 0 ? section('Past', past, '') : null}
            </>
          )}

          <Dialog
            open={creating}
            title={step === 'review' ? 'Review maintenance' : 'Schedule maintenance'}
            onClose={() => setCreating(false)}
            closeable={!submitting}
            actions={
              step === 'review' ? (
                <>
                  <Button variant="secondary" disabled={submitting} onClick={() => setStep('edit')}>
                    Back
                  </Button>
                  <Button
                    loading={submitting}
                    loadingLabel="Publishing"
                    onClick={() => void publish()}
                  >
                    {draft?.view.mode === 'NOW' ? 'Start maintenance' : 'Schedule maintenance'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" form="new-maintenance">
                    Review
                  </Button>
                </>
              )
            }
          >
            {step === 'review' && draft ? (
              <Stack gap={3}>
                <Stack gap={1}>
                  <Text as="h3" tone="label">
                    {draft.view.title}
                  </Text>
                  <Stack direction="horizontal" gap={2}>
                    <StatusPill
                      status={draft.view.mode === 'NOW' ? 'IN_PROGRESS' : 'SCHEDULED'}
                      kind="maintenance"
                    />
                  </Stack>
                </Stack>
                <Stack gap={2}>
                  <Text tone="caption">When</Text>
                  <DraftSchedule draft={draft.view} now={draft.reviewedAt} />
                </Stack>
                <Stack gap={2}>
                  <Text tone="caption">Message</Text>
                  <RichTextBody markdown={draft.view.body} />
                </Stack>
                {affectedNames(draft.view).length === 0 ? (
                  <Text tone="caption">No components affected.</Text>
                ) : (
                  <Stack gap={2}>
                    <Text tone="caption">Affected components</Text>
                    <TreeList>
                      {affectedNames(draft.view).map((name) => (
                        <TreeRow key={name} title={name} />
                      ))}
                    </TreeList>
                  </Stack>
                )}
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            ) : null}
            <div hidden={step === 'review'}>
              <MaintenanceForm
                formId="new-maintenance"
                initial={defaultSchedule()}
                components={components}
                groups={groups}
                disabled={submitting}
                onSubmit={(payload, view) => {
                  setFormError(null);
                  setDraft({ payload, view, reviewedAt: reviewedNow() });
                  setStep('review');
                }}
              />
            </div>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
