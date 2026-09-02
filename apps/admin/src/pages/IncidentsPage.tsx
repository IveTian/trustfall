import {
  Button,
  Card,
  Dialog,
  Field,
  IconButton,
  ImpactSelect,
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
  TreeChevron,
  TreeList,
  TreeNest,
  TreeRow,
  componentStatusPresentation,
  impactStatusLabels,
  incidentStatusPresentation,
} from '@trustfall/design';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES, INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
};

type Component = { id: string; display_name: string; group_id: string | null; position: number };
type Group = { id: string; display_name: string; position: number };

function byPosition(a: { position: number; display_name: string }, b: typeof a) {
  return a.position - b.position || a.display_name.localeCompare(b.display_name);
}

/** The group's select shows its worst member; severity follows the enum order. */
function worstImpact(statuses: ImpactStatus[]): ImpactStatus {
  let worst: ImpactStatus = 'OPERATIONAL';
  for (const status of statuses) {
    if (COMPONENT_STATUSES.indexOf(status) > COMPONENT_STATUSES.indexOf(worst)) {
      worst = status;
    }
  }
  return worst;
}

export function IncidentsPage() {
  // `null` means the first load has not landed yet; an empty array is a real
  // "no incidents" answer.
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Per-component impact choice for the dialog; absent means "No impact".
  const [impacts, setImpacts] = useState<Record<string, ImpactStatus>>({});
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set());
  // The dialog publishes in two steps: fill the form, review what readers
  // will see, then publish. The form stays mounted (hidden) during review so
  // Back returns to it untouched.
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draft, setDraft] = useState<{ title: string; status: string; body: string } | null>(null);
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [incidentPage, componentPage, groupPage] = await Promise.all([
        // No `state` filter: the admin list shows open and resolved alike.
        api<Page<Incident>>('/api/incidents'),
        api<Page<Component>>('/api/components'),
        api<Page<Group>>('/api/component-groups'),
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
    setExpandedGroups(new Set());
    setStep('edit');
    setDraft(null);
    setCreating(true);
  }

  // A component whose group vanished between loads still shows up: it lands
  // in the ungrouped rows rather than disappearing from the dialog.
  function groupIdOf(component: Component): string | null {
    return groups.some((group) => group.id === component.group_id) ? component.group_id : null;
  }

  function membersOf(groupId: string | null): Component[] {
    return components.filter((c) => groupIdOf(c) === groupId).sort(byPosition);
  }

  function impactOf(componentId: string): ImpactStatus {
    return impacts[componentId] ?? 'OPERATIONAL';
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

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
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
    setFormError(null);
    setDraft({
      title: String(form.get('title')),
      status: String(form.get('status')),
      body: String(form.get('body')),
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
  function affectedInOrder(): Array<{ component: Component; status: ImpactStatus }> {
    const ordered = [
      ...membersOf(null),
      ...[...groups].sort(byPosition).flatMap((group) => membersOf(group.id)),
    ];
    return ordered
      .map((component) => ({ component, status: impactOf(component.id) }))
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
                <Card key={incident.id}>
                  <Stack gap={2}>
                    <Stack direction="horizontal" gap={2}>
                      <StatusPill status={incident.status} kind="incident" />
                      <StatusPill status={incident.impact} kind="impact" />
                    </Stack>
                    <Text tone="title">{incident.title}</Text>
                    <Link to={`/incidents/${incident.id}`}>Open timeline</Link>
                  </Stack>
                </Card>
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
                <RichTextBody markdown={draft.body} />
                {affectedInOrder().length === 0 ? (
                  <Text tone="caption">No components affected.</Text>
                ) : (
                  <Stack gap={2}>
                    <Text tone="caption">Affected components</Text>
                    <TreeList>
                      {affectedInOrder().map(({ component, status }) => {
                        const presentation = componentStatusPresentation[status];
                        return (
                          <TreeRow
                            key={component.id}
                            title={component.display_name}
                            end={
                              <>
                                <StatusIcon
                                  icon={presentation.icon}
                                  tone={presentation.tone}
                                  title={impactStatusLabels[status]}
                                />
                                <Text tone="caption" as="span">
                                  {impactStatusLabels[status]}
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
                  <Stack gap={2}>
                    <Text tone="caption">Affected components</Text>
                    {components.length === 0 ? (
                      <Text tone="caption">No components yet.</Text>
                    ) : (
                      <TreeList>
                        {membersOf(null).map((component) => (
                          <TreeRow
                            key={component.id}
                            title={component.display_name}
                            end={
                              <ImpactSelect
                                status={impactOf(component.id)}
                                componentName={component.display_name}
                                disabled={submitting}
                                onChange={(status) => setImpact([component.id], status)}
                              />
                            }
                          />
                        ))}
                        {[...groups].sort(byPosition).map((group) => {
                          const members = membersOf(group.id);
                          // An empty group has nothing an incident can affect.
                          if (members.length === 0) {
                            return null;
                          }
                          const expanded = expandedGroups.has(group.id);
                          return (
                            <TreeRow
                              key={group.id}
                              title={group.display_name}
                              end={
                                <>
                                  <ImpactSelect
                                    status={worstImpact(members.map((m) => impactOf(m.id)))}
                                    componentName={group.display_name}
                                    disabled={submitting}
                                    onChange={(status) =>
                                      setImpact(
                                        members.map((m) => m.id),
                                        status,
                                      )
                                    }
                                  />
                                  <IconButton
                                    label={`${expanded ? 'Collapse' : 'Expand'} ${group.display_name}`}
                                    aria-expanded={expanded}
                                    onClick={() => toggleGroup(group.id)}
                                  >
                                    <TreeChevron open={expanded} />
                                  </IconButton>
                                </>
                              }
                              nest={
                                <TreeNest open={expanded}>
                                  {members.map((component) => (
                                    <TreeRow
                                      key={component.id}
                                      title={component.display_name}
                                      end={
                                        <ImpactSelect
                                          status={impactOf(component.id)}
                                          componentName={component.display_name}
                                          disabled={submitting}
                                          onChange={(status) => setImpact([component.id], status)}
                                        />
                                      }
                                    />
                                  ))}
                                </TreeNest>
                              }
                            />
                          );
                        })}
                      </TreeList>
                    )}
                  </Stack>
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
