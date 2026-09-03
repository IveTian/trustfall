import {
  Button,
  DateTime,
  Dialog,
  Field,
  type ImpactStatus,
  Input,
  PageBody,
  PageHeader,
  RichTextEditor,
  Select,
  Skeleton,
  Stack,
  StatusPill,
  Text,
  RichTextBody,
  StatusIcon,
  Toast,
  TreeList,
  TreeRow,
  impactStatusPresentation,
  incidentStatusPresentation,
} from '@trustfall/design';
import type { IncidentStatus } from '@trustfall/shared';
import { INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import {
  AffectedComponentsField,
  type AffectedComponent,
  type AffectedGroup,
  byPosition,
  membersOf,
} from '../components/AffectedComponentsField.tsx';
import { IncidentSummaryCard, type IncidentSummary } from '../components/IncidentSummaryCard.tsx';
import { WhenField, whenError, type WhenMode } from '../components/WhenField.tsx';
import { useToast } from '../lib/toast.ts';

export function IncidentsPage() {
  const navigate = useNavigate();
  // `null` means the first load has not landed yet; an empty array is a real
  // "no incidents" answer.
  const [incidents, setIncidents] = useState<IncidentSummary[] | null>(null);
  const [components, setComponents] = useState<AffectedComponent[]>([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Per-component impact choice for the dialog; absent means "No impact".
  const [impacts, setImpacts] = useState<Record<string, ImpactStatus>>({});
  // The dialog publishes in two steps: fill the form, review what readers
  // will see, then publish. The form stays mounted (hidden) during review so
  // Back returns to it untouched.
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draft, setDraft] = useState<{
    title: string;
    status: string;
    body: string;
    startedAt: number | null;
  } | null>(null);
  // When the incident began: right away, or a chosen instant in the past.
  const [when, setWhen] = useState<WhenMode>('NOW');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [incidentPage, componentPage, groupPage] = await Promise.all([
        // No `state` filter: the admin list shows open and resolved alike.
        api<Page<IncidentSummary>>('/api/incidents'),
        api<Page<AffectedComponent>>('/api/components'),
        api<Page<AffectedGroup>>('/api/component-groups'),
      ]);
      setIncidents(incidentPage.items);
      setComponents(componentPage.items);
      setGroups(groupPage.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load incidents.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setFormError(null);
    setImpacts({});
    setStep('edit');
    setDraft(null);
    setWhen('NOW');
    setStartedAt(null);
    setCreating(true);
  }

  function setImpact(componentIds: string[], status: ImpactStatus) {
    setImpacts((prev) => {
      const next = { ...prev };
      for (const id of componentIds) {
        next[id] = status;
      }
      return next;
    });
  }

  function reviewIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // The rich text editor reports through a hidden field, out of reach of
    // native `required` — emptiness is checked here instead.
    if (!String(form.get('body') ?? '').trim()) {
      setFormError('Message is required.');
      return;
    }
    const timeError = whenError(when, startedAt, 'Start now');
    if (timeError) {
      setFormError(timeError);
      return;
    }
    setFormError(null);
    setDraft({
      title: String(form.get('title')),
      status: String(form.get('status')),
      body: String(form.get('body')),
      startedAt: when === 'CUSTOM' ? startedAt : null,
    });
    setStep('review');
  }

  async function publishIncident() {
    if (!draft) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // "No impact" means not affected: those components stay out of the
    // incident entirely.
    const affected = Object.entries(impacts).filter(([, status]) => status !== 'OPERATIONAL');
    try {
      await api('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title,
          // The dialog no longer asks for impact; every incident opens MINOR
          // and the timeline tells the real story.
          impact: 'MINOR',
          status: draft.status,
          body: draft.body,
          component_ids: affected.map(([id]) => id),
          component_statuses: Object.fromEntries(affected),
          ...(draft.startedAt != null
            ? { started_at: new Date(draft.startedAt).toISOString() }
            : {}),
        }),
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not publish the incident.');
      return;
    } finally {
      setSubmitting(false);
    }
    // Closing unmounts the dialog form, so the next open starts blank.
    setCreating(false);
    showToast('Incident published.');
    await refresh();
  }

  // Review lists the affected components in the order the tree shows them.
  function affectedInOrder(): Array<{ component: AffectedComponent; status: ImpactStatus }> {
    const ordered = [
      ...membersOf(components, groups, null),
      ...[...groups].sort(byPosition).flatMap((group) => membersOf(components, groups, group.id)),
    ];
    return ordered
      .map((component) => ({ component, status: impacts[component.id] ?? 'OPERATIONAL' }))
      .filter((entry) => entry.status !== 'OPERATIONAL');
  }

  return (
    <>
      <PageHeader
        icon="alert-fill"
        trail={['Incidents']}
        actions={<Button onClick={openCreate}>New incident</Button>}
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
          ) : incidents == null ? (
            <Stack gap={3}>
              <Skeleton label="Loading incidents" />
              <Skeleton label="Loading incidents" />
            </Stack>
          ) : incidents.length === 0 ? (
            <Text tone="muted">No incidents yet. Open one when something breaks.</Text>
          ) : (
            <Stack gap={3}>
              {incidents.map((incident) => (
                <IncidentSummaryCard
                  key={incident.id}
                  incident={incident}
                  onOpen={() => navigate(`/incidents/${incident.id}`)}
                />
              ))}
            </Stack>
          )}

          <Dialog
            open={creating}
            title={step === 'review' ? 'Review incident' : 'Open an incident'}
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
                    onClick={() => void publishIncident()}
                  >
                    Publish incident
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
                  <Button type="submit" form="new-incident">
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
                    {draft.title}
                  </Text>
                  <Stack direction="horizontal" gap={2}>
                    <StatusPill status={draft.status as IncidentStatus} kind="incident" />
                  </Stack>
                </Stack>
                <Stack gap={2}>
                  <Text tone="caption">Started</Text>
                  {draft.startedAt == null ? (
                    <Text>Right now</Text>
                  ) : (
                    <Text>
                      <DateTime value={draft.startedAt} />
                    </Text>
                  )}
                </Stack>
                <RichTextBody markdown={draft.body} />
                {affectedInOrder().length === 0 ? (
                  <Text tone="caption">No components affected.</Text>
                ) : (
                  <Stack gap={2}>
                    <Text tone="caption">Affected components</Text>
                    <TreeList>
                      {affectedInOrder().map(({ component, status }) => {
                        const presentation = impactStatusPresentation[status];
                        return (
                          <TreeRow
                            key={component.id}
                            title={component.display_name}
                            end={
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
                            }
                          />
                        );
                      })}
                    </TreeList>
                  </Stack>
                )}
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            ) : null}
            <div hidden={step === 'review'}>
              <form id="new-incident" onSubmit={reviewIncident}>
                <Stack gap={3}>
                  <Field label="Name" htmlFor="title">
                    <Input id="title" name="title" required disabled={submitting} />
                  </Field>
                  <Field label="Status" htmlFor="status">
                    <Select
                      id="status"
                      name="status"
                      defaultValue="INVESTIGATING"
                      disabled={submitting}
                      options={INCIDENT_STATUSES.filter((status) => status !== 'RESOLVED').map(
                        (status) => ({
                          value: status,
                          label: incidentStatusPresentation[status].label,
                        }),
                      )}
                    />
                  </Field>
                  <Field label="Message" htmlFor="body">
                    <RichTextEditor id="body" name="body" disabled={submitting} />
                  </Field>
                  <WhenField
                    id="started-at"
                    mode={when}
                    at={startedAt}
                    disabled={submitting}
                    onModeChange={setWhen}
                    onAtChange={setStartedAt}
                  />
                  <AffectedComponentsField
                    components={components}
                    groups={groups}
                    impacts={impacts}
                    onSetImpact={setImpact}
                    disabled={submitting}
                  />
                  {formError != null ? <Text tone="caption">{formError}</Text> : null}
                </Stack>
              </form>
            </div>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
