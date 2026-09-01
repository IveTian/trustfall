import {
  Button,
  Field,
  PageBody,
  PageHeader,
  Select,
  Stack,
  Text,
  Textarea,
  incidentStatusPresentation,
} from '@trustfall/design';
import { IncidentTimeline } from '@trustfall/design';
import type { IncidentStatus } from '@trustfall/shared';
import { INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api.ts';

type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: 'MINOR' | 'MAJOR' | 'CRITICAL';
  started_at: string;
  updates: Array<{ id: string; status: IncidentStatus; body: string; created_at: string }>;
};

export function IncidentDetailPage() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);

  const refresh = useCallback(async () => {
    if (!incidentId) {
      return;
    }
    setIncident(await api<Incident>(`/api/incidents/${incidentId}`));
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
    await api(`/api/incidents/${incidentId}/updates`, {
      method: 'POST',
      body: JSON.stringify({
        status: form.get('status'),
        body: form.get('body'),
      }),
    });
    event.currentTarget.reset();
    await refresh();
  }

  // Resolving is a timeline update like any other: the status transition and
  // the explanation readers get are the same act.
  async function resolve() {
    if (!incidentId) {
      return;
    }
    await api(`/api/incidents/${incidentId}/updates`, {
      method: 'POST',
      body: JSON.stringify({ status: 'RESOLVED', body: 'This incident has been resolved.' }),
    });
    await refresh();
  }

  if (!incident) {
    return (
      <>
        <PageHeader icon="alert-fill" trail={['Status', 'Incidents']} />
        <PageBody>
          <Text tone="muted">Loading incident…</Text>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader icon="alert-fill" trail={['Status', 'Incidents', incident.title]} />
      <PageBody>
        <Stack gap={4}>
          <IncidentTimeline
            updates={incident.updates.map((update) => ({
              id: update.id,
              status: update.status,
              body: update.body,
              createTime: Date.parse(update.created_at),
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
              <Stack direction="horizontal" gap={2}>
                <Button type="submit">Post update</Button>
                <Button type="button" variant="danger" onClick={resolve}>
                  Resolve incident
                </Button>
              </Stack>
            </Stack>
          </form>
        </Stack>
      </PageBody>
    </>
  );
}
