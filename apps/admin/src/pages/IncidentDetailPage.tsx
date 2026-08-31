import { Button, Field, Select, Stack, Text, Textarea, incidentStatusPresentation } from '@trustfall/design';
import { IncidentTimeline } from '@trustfall/design';
import type { IncidentStatus } from '@trustfall/shared';
import { INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api.ts';

type Incident = {
  name: string;
  title: string;
  status: IncidentStatus;
  impact: 'MINOR' | 'MAJOR' | 'CRITICAL';
  startTime: string;
  updates: Array<{ name: string; status: IncidentStatus; body: string; createTime: string }>;
};

export function IncidentDetailPage() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);

  const refresh = useCallback(async () => {
    if (!incidentId) {
      return;
    }
    setIncident(await api<Incident>(`/api/v1/incidents/${incidentId}`));
  }, [incidentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!incidentId) {
      return;
    }
    const form = new FormData(event.currentTarget);
    await api(`/api/v1/incidents/${incidentId}/updates`, {
      method: 'POST',
      body: JSON.stringify({
        status: form.get('status'),
        body: form.get('body'),
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  async function resolve() {
    if (!incidentId) {
      return;
    }
    await api(`/api/v1/incidents/${incidentId}:resolve`, {
      method: 'POST',
      body: JSON.stringify({ body: 'This incident has been resolved.' }),
    });
    await refresh();
  }

  if (!incident) {
    return <Text tone="muted">Loading incident…</Text>;
  }

  return (
    <Stack gap={4}>
      <Text as="h1" tone="display">
        {incident.title}
      </Text>
      <IncidentTimeline
        updates={incident.updates.map((update) => ({
          id: update.name,
          status: update.status,
          body: update.body,
          createTime: Date.parse(update.createTime),
        }))}
      />
      <form onSubmit={onUpdate}>
        <Stack gap={3}>
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={incident.status}>
              {INCIDENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {incidentStatusPresentation[status].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Update" htmlFor="body">
            <Textarea id="body" name="body" required />
          </Field>
          <Button type="submit">Post update</Button>
          <Button type="button" variant="danger" onClick={resolve}>
            Resolve incident
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
