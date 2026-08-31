import { Button, Card, Field, Input, Select, Stack, StatusPill, Text, Textarea, incidentImpactPresentation, incidentStatusPresentation } from '@trustfall/design';
import type { IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api.ts';

type Incident = {
  name: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
};

type Component = { name: string; displayName: string };

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  async function refresh() {
    const [incidentData, componentData] = await Promise.all([
      api<{ incidents: Incident[] }>('/api/v1/incidents?filter=all'),
      api<{ components: Component[] }>('/api/v1/components'),
    ]);
    setIncidents(incidentData.incidents);
    setComponents(componentData.components);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selected = form.getAll('componentIds');
    await api('/api/v1/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.get('title'),
        impact: form.get('impact'),
        status: form.get('status'),
        body: form.get('body'),
        componentIds: selected,
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  return (
    <Stack gap={5}>
      <Text as="h1" tone="display">
        Incidents
      </Text>
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
                <label key={component.name}>
                  <input type="checkbox" name="componentIds" value={component.name} />{' '}
                  {component.displayName}
                </label>
              ))}
            </fieldset>
            <Button type="submit">Publish incident</Button>
          </Stack>
        </form>
      </Card>
      <Stack gap={3}>
        {incidents.map((incident) => (
          <Card key={incident.name}>
            <Stack gap={2}>
              <Stack direction="horizontal" gap={2}>
                <StatusPill status={incident.status} kind="incident" />
                <StatusPill status={incident.impact} kind="impact" />
              </Stack>
              <Text tone="title">{incident.title}</Text>
              <Link to={`/incidents/${incident.name.split('/')[1]}`}>Open timeline</Link>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
