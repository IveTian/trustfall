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
  incidentImpactPresentation,
  incidentStatusPresentation,
} from '@trustfall/design';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, type Page } from '../lib/api.ts';

type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
};

type Component = { id: string; display_name: string };

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  async function refresh() {
    const [incidentPage, componentPage] = await Promise.all([
      // No `state` filter: the admin list shows open and resolved alike.
      api<Page<Incident>>('/api/incidents'),
      api<Page<Component>>('/api/components'),
    ]);
    setIncidents(incidentPage.items);
    setComponents(componentPage.items);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = form.getAll('component_ids');
    await api('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.get('title'),
        impact: form.get('impact'),
        status: form.get('status'),
        body: form.get('body'),
        component_ids: selected,
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  return (
    <>
      <PageHeader icon="alert-fill" trail={['Status', 'Incidents']} />
      <PageBody>
        <Stack gap={5}>
          <Card>
            <form onSubmit={createIncident}>
              <Stack gap={3}>
                <Text as="h2" tone="title">
                  Open an incident
                </Text>
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
                <fieldset>
                  <Text tone="caption">Affected components</Text>
                  {components.map((component) => (
                    <label key={component.id}>
                      <input type="checkbox" name="component_ids" value={component.id} />{' '}
                      {component.display_name}
                    </label>
                  ))}
                </fieldset>
                <Stack direction="horizontal" gap={2}>
                  <Button type="submit">Publish incident</Button>
                </Stack>
              </Stack>
            </form>
          </Card>
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
        </Stack>
      </PageBody>
    </>
  );
}
