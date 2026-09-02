import {
  Button,
  Card,
  Checkbox,
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
  incidentImpactPresentation,
  incidentStatusPresentation,
} from '@trustfall/design';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
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

type Component = { id: string; display_name: string };

export function IncidentsPage() {
  // `null` means the first load has not landed yet; an empty array is a real
  // "no incidents" answer.
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [incidentPage, componentPage] = await Promise.all([
        // No `state` filter: the admin list shows open and resolved alike.
        api<Page<Incident>>('/api/incidents'),
        api<Page<Component>>('/api/components'),
      ]);
      setIncidents(incidentPage.items);
      setComponents(componentPage.items);
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
    setCreating(true);
  }

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setFormError(null);
    try {
      await api('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          impact: form.get('impact'),
          status: form.get('status'),
          body: form.get('body'),
          component_ids: form.getAll('component_ids'),
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

  return (
    <>
      <PageHeader
        icon="alert-fill"
        trail={['Status', 'Incidents']}
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
            title="Open an incident"
            onClose={() => setCreating(false)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="new-incident"
                  loading={submitting}
                  loadingLabel="Publishing"
                >
                  Publish incident
                </Button>
              </>
            }
          >
            <form id="new-incident" onSubmit={createIncident}>
              <Stack gap={3}>
                <Field label="Title" htmlFor="title">
                  <Input id="title" name="title" required />
                </Field>
                <Field label="Impact" htmlFor="impact">
                  <Select id="impact" name="impact" defaultValue="MINOR">
                    {INCIDENT_IMPACTS.map((impact) => (
                      <option key={impact} value={impact}>
                        {incidentImpactPresentation[impact].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue="INVESTIGATING">
                    {INCIDENT_STATUSES.filter((status) => status !== 'RESOLVED').map((status) => (
                      <option key={status} value={status}>
                        {incidentStatusPresentation[status].label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Update" htmlFor="body">
                  <Textarea id="body" name="body" required />
                </Field>
                <Stack gap={2}>
                  <Text tone="caption">Affected components</Text>
                  {components.length === 0 ? (
                    <Text tone="caption">No components yet.</Text>
                  ) : (
                    components.map((component) => (
                      <Checkbox
                        key={component.id}
                        name="component_ids"
                        value={component.id}
                        label={component.display_name}
                      />
                    ))
                  )}
                </Stack>
                {formError != null ? <Text tone="caption">{formError}</Text> : null}
              </Stack>
            </form>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
