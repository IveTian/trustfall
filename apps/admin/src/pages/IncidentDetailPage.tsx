import {
  AffectedComponentsChart,
  type ChartComponent,
  DiffBlock,
  type DiffLine,
  Icon,
  IncidentTimeline,
  Menu,
  RelativeTime,
  RichTextBody,
  StatusPill,
  impactStatusLabels,
  type ImpactStatus,
  Button,
  Dialog,
  Field,
  PageBody,
  PageHeader,
  Select,
  Skeleton,
  Stack,
  Text,
  RichTextEditor,
  Toast,
  incidentStatusPresentation,
} from '@trustfall/design';
import type { ComponentStatus, IncidentStatus } from '@trustfall/shared';
import { INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import {
  AffectedComponentsField,
  type AffectedComponent,
  type AffectedGroup,
  byPosition,
  membersOf,
} from '../components/AffectedComponentsField.tsx';
import { useToast } from '../lib/toast.ts';

type Affected = { component_id: string; display_name: string; status: ComponentStatus };

type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: 'MINOR' | 'MAJOR' | 'CRITICAL';
  started_at: string;
  resolved_at: string | null;
  updates: Array<{
    id: string;
    status: IncidentStatus;
    body: string;
    created_at: string;
    affected_components: Affected[];
  }>;
  affected_components: Affected[];
};

const absoluteTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Every component the incident has ever named, in the dashboard's order:
 * ungrouped first, then group by group. A component deleted since it was
 * named keeps the name its snapshot recorded and lands at the end.
 */
function chartComponents(
  incident: Incident,
  components: AffectedComponent[],
  groups: AffectedGroup[],
): ChartComponent[] {
  const named = new Map<string, Affected>();
  for (const update of incident.updates) {
    for (const affected of update.affected_components) {
      named.set(affected.component_id, affected);
    }
  }
  for (const affected of incident.affected_components) {
    named.set(affected.component_id, affected);
  }
  const current = new Map(
    incident.affected_components.map((affected) => [affected.component_id, affected.status]),
  );
  const statusOf = (id: string): ComponentStatus => current.get(id) ?? 'OPERATIONAL';

  const ordered: ChartComponent[] = [];
  const seen = new Set<string>();
  const place = (component: AffectedComponent, group: string | null) => {
    if (!named.has(component.id)) {
      return;
    }
    seen.add(component.id);
    ordered.push({
      id: component.id,
      displayName: component.display_name,
      status: statusOf(component.id),
      group,
    });
  };
  for (const component of membersOf(components, groups, null)) {
    place(component, null);
  }
  for (const group of [...groups].sort(byPosition)) {
    for (const component of membersOf(components, groups, group.id)) {
      place(component, group.display_name);
    }
  }
  for (const [id, affected] of named) {
    if (!seen.has(id)) {
      ordered.push({ id, displayName: affected.display_name, status: statusOf(id), group: null });
    }
  }
  return ordered;
}

export function IncidentDetailPage() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [components, setComponents] = useState<AffectedComponent[]>([]);
  const [groups, setGroups] = useState<AffectedGroup[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // The dialog opens on the incident's current affected set; the diff against
  // this baseline is what a published update sends.
  const [impacts, setImpacts] = useState<Record<string, ImpactStatus>>({});
  const [baseline, setBaseline] = useState<Record<string, ImpactStatus>>({});
  // Publishing is two steps: write the update, review the exact changes it
  // makes, then publish. The form stays mounted (hidden) during review so
  // Back returns to it untouched.
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draft, setDraft] = useState<{ status: string; body: string } | null>(null);
  const [toast, showToast] = useToast();
  // When the incident was last loaded: the open chart's "now" edge.
  const [loadedAt, setLoadedAt] = useState(() => Date.now());

  const backTrail = { label: 'Incidents', onSelect: () => navigate('/incidents') };

  const refresh = useCallback(async () => {
    if (!incidentId) {
      return;
    }
    try {
      const [loaded, componentPage, groupPage] = await Promise.all([
        api<Incident>(`/api/incidents/${incidentId}`),
        api<Page<AffectedComponent>>('/api/components'),
        api<Page<AffectedGroup>>('/api/component-groups'),
      ]);
      setIncident(loaded);
      setComponents(componentPage.items);
      setGroups(groupPage.items);
      setLoadedAt(Date.now());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the incident.');
    }
  }, [incidentId]);

  function currentImpacts(loaded: Incident): Record<string, ImpactStatus> {
    return Object.fromEntries(
      loaded.affected_components.map((affected) => [
        affected.component_id,
        affected.status as ImpactStatus,
      ]),
    );
  }

  function openUpdate() {
    if (!incident) {
      return;
    }
    const current = currentImpacts(incident);
    setImpacts(current);
    setBaseline(current);
    setFormError(null);
    setStep('edit');
    setDraft(null);
    setUpdating(true);
  }

  // Only what the operator changed travels: untouched components must not be
  // rewritten, or an unrelated incident's declarations would be undone.
  function changedImpacts(): Record<string, ImpactStatus> {
    return Object.fromEntries(
      Object.entries(impacts).filter(([id, status]) => (baseline[id] ?? 'OPERATIONAL') !== status),
    );
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function postUpdate(body: {
    status: string;
    body: string;
    component_statuses?: Record<string, ImpactStatus>;
  }): Promise<boolean> {
    if (!incidentId) {
      return false;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api(`/api/incidents/${incidentId}/updates`, {
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

  function reviewUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // The rich text editor reports through a hidden field, out of reach of
    // native `required` — emptiness is checked here instead.
    if (!String(form.get('body') ?? '').trim()) {
      setFormError('Message is required.');
      return;
    }
    setFormError(null);
    setDraft({
      status: String(form.get('status')),
      body: String(form.get('body')),
    });
    setStep('review');
  }

  async function publishUpdate() {
    if (!draft) {
      return;
    }
    const changed = changedImpacts();
    const posted = await postUpdate({
      status: draft.status,
      body: draft.body,
      ...(Object.keys(changed).length > 0 ? { component_statuses: changed } : {}),
    });
    if (!posted) {
      return;
    }
    // Closing unmounts the dialog form, so the next open starts blank.
    setUpdating(false);
    showToast('Update published.');
    await refresh();
  }

  // What review shows, spoken in diff: the incident's status transition and
  // every component the update re-declares.
  function statusDiff(): DiffLine[] {
    if (!incident || !draft) {
      return [];
    }
    const from = incidentStatusPresentation[incident.status].label;
    const to = incidentStatusPresentation[draft.status as IncidentStatus].label;
    if (from === to) {
      return [{ kind: 'context', text: from }];
    }
    return [
      { kind: 'removed', text: from },
      { kind: 'added', text: to },
    ];
  }

  function componentDiff(): DiffLine[] {
    const changed = changedImpacts();
    const ordered = [
      ...membersOf(components, groups, null),
      ...[...groups].sort(byPosition).flatMap((group) => membersOf(components, groups, group.id)),
    ];
    const lines: DiffLine[] = [];
    for (const component of ordered) {
      const status = changed[component.id];
      if (status === undefined) {
        continue;
      }
      const before = baseline[component.id] ?? 'OPERATIONAL';
      if (before !== 'OPERATIONAL') {
        lines.push({
          kind: 'removed',
          text: `${component.display_name}: ${impactStatusLabels[before]}`,
        });
      }
      if (status !== 'OPERATIONAL') {
        lines.push({
          kind: 'added',
          text: `${component.display_name}: ${impactStatusLabels[status]}`,
        });
      }
    }
    return lines;
  }

  async function deleteIncident() {
    if (!incidentId) {
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/incidents/${incidentId}`, { method: 'DELETE' });
    } catch (err) {
      setSubmitting(false);
      setConfirmingDelete(false);
      showToast(err instanceof Error ? err.message : 'Could not delete the incident.');
      return;
    }
    setSubmitting(false);
    showToast('Incident deleted.');
    navigate('/incidents');
  }

  if (loadError != null) {
    return (
      <>
        <PageHeader icon="alert-fill" trail={[backTrail, 'Incident']} />
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

  if (!incident) {
    return (
      <>
        <PageHeader icon="alert-fill" trail={[backTrail, 'Incident']} />
        <PageBody>
          <Stack gap={3}>
            <Skeleton label="Loading incident" />
            <Skeleton label="Loading incident" />
          </Stack>
        </PageBody>
      </>
    );
  }

  const resolved = incident.status === 'RESOLVED';
  const affected = chartComponents(incident, components, groups);
  const timelineUpdates = incident.updates.map((update) => ({
    id: update.id,
    status: update.status,
    body: update.body,
    createTime: Date.parse(update.created_at),
    components: update.affected_components.map((item) => ({
      componentId: item.component_id,
      displayName: item.display_name,
      status: item.status,
    })),
  }));

  return (
    <>
      <PageHeader
        icon="alert-fill"
        trail={[backTrail, incident.title]}
        actions={
          <>
            <Menu
              label="More actions"
              variant="icon"
              items={[
                {
                  id: 'delete',
                  label: 'Delete incident',
                  icon: <Icon name="delete" size={16} />,
                  onSelect: () => setConfirmingDelete(true),
                },
              ]}
            >
              <Icon name="more" size={16} />
            </Menu>
            <Button
              variant="secondary"
              startEnhancer={<Icon name="external-link" size={16} />}
              onClick={() => window.open(`/incidents/${incident.id}`, '_blank', 'noopener')}
            >
              View on status page
            </Button>
            <Button onClick={openUpdate}>Publish update</Button>
          </>
        }
      />
      <PageBody>
        <Stack gap={6}>
          <Stack gap={3}>
            <Text as="h2" tone="display">
              {incident.title}
            </Text>
            <Stack direction="horizontal" gap={2} wrap>
              <StatusPill status={incident.status} kind="incident" />
              <StatusPill status={incident.impact} kind="impact" />
            </Stack>
            <Text tone="caption">
              Started {absoluteTime.format(new Date(incident.started_at))} ·{' '}
              <RelativeTime value={incident.started_at} />
              {incident.resolved_at ? (
                <> · Resolved {absoluteTime.format(new Date(incident.resolved_at))}</>
              ) : null}
            </Text>
          </Stack>

          <Stack gap={4}>
            <Text as="h2" tone="label">
              Updates
            </Text>
            <IncidentTimeline updates={timelineUpdates} />
          </Stack>

          <Stack gap={4}>
            <Stack direction="horizontal" justify="between" gap={3}>
              <Text as="h2" tone="label">
                Affected components
              </Text>
              {resolved ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  startEnhancer={<Icon name="edit" size={16} />}
                  onClick={openUpdate}
                >
                  Edit
                </Button>
              )}
            </Stack>
            {affected.length === 0 ? (
              <Text tone="muted">
                No components were affected.
                {resolved ? '' : ' Edit to declare the ones this incident touches.'}
              </Text>
            ) : (
              <AffectedComponentsChart
                components={affected}
                updates={timelineUpdates}
                startTime={Date.parse(incident.started_at)}
                endTime={incident.resolved_at ? Date.parse(incident.resolved_at) : null}
                now={loadedAt}
              />
            )}
          </Stack>

          <Dialog
            open={updating}
            title={step === 'review' ? 'Review update' : 'Publish update'}
            onClose={() => setUpdating(false)}
            closeable={!submitting}
            actions={
              step === 'review' ? (
                <>
                  <Button variant="secondary" disabled={submitting} onClick={() => setStep('edit')}>
                    Back
                  </Button>
                  <Button
                    loading={submitting && !confirmingDelete}
                    loadingLabel="Publishing"
                    onClick={() => void publishUpdate()}
                  >
                    Publish update
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    disabled={submitting}
                    onClick={() => setUpdating(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" form="publish-update">
                    Review
                  </Button>
                </>
              )
            }
          >
            {step === 'review' && draft ? (
              <Stack gap={3}>
                <Stack gap={2}>
                  <Text tone="caption">Status</Text>
                  <DiffBlock lines={statusDiff()} />
                </Stack>
                <Stack gap={2}>
                  <Text tone="caption">Message</Text>
                  <RichTextBody markdown={draft.body} />
                </Stack>
                {componentDiff().length > 0 ? (
                  <Stack gap={2}>
                    <Text tone="caption">Affected components</Text>
                    <DiffBlock lines={componentDiff()} />
                  </Stack>
                ) : null}
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            ) : null}
            <div hidden={step === 'review'}>
              <form id="publish-update" onSubmit={reviewUpdate}>
                <Stack gap={3}>
                  {resolved ? (
                    <input type="hidden" name="status" value="RESOLVED" />
                  ) : (
                    <Field label="Status" htmlFor="status">
                      <Select
                        id="status"
                        name="status"
                        defaultValue={incident.status}
                        disabled={submitting}
                        options={INCIDENT_STATUSES.map((status) => ({
                          value: status,
                          label: incidentStatusPresentation[status].label,
                        }))}
                      />
                    </Field>
                  )}
                  <Field label="Message" htmlFor="body">
                    <RichTextEditor id="body" name="body" disabled={submitting} />
                  </Field>
                  {resolved ? null : (
                    <AffectedComponentsField
                      components={components}
                      groups={groups}
                      impacts={impacts}
                      onSetImpact={setImpact}
                      disabled={submitting}
                    />
                  )}
                  {formError != null ? <Text tone="caption">{formError}</Text> : null}
                </Stack>
              </form>
            </div>
          </Dialog>

          <Dialog
            open={confirmingDelete}
            title="Delete incident?"
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
                  onClick={() => void deleteIncident()}
                >
                  Delete
                </Button>
              </>
            }
          >
            <Text>
              The incident and its whole timeline disappear from the status page immediately, and
              affected components return to operational. This cannot be undone.
            </Text>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
