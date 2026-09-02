import {
  Button,
  Dialog,
  Field,
  PageBody,
  PageHeader,
  Select,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Toast,
  incidentStatusPresentation,
} from '@trustfall/design';
import { IncidentTimeline } from '@trustfall/design';
import type { IncidentStatus } from '@trustfall/shared';
import { INCIDENT_STATUSES } from '@trustfall/shared';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingResolve, setConfirmingResolve] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  const refresh = useCallback(async () => {
    if (!incidentId) {
      return;
    }
    try {
      setIncident(await api<Incident>(`/api/incidents/${incidentId}`));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the incident.');
    }
  }, [incidentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function postUpdate(body: { status: string; body: string }): Promise<boolean> {
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

  async function onUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // `currentTarget` is nulled once the event finishes dispatching, so grab
    // the form now — after the awaits below it is gone.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const posted = await postUpdate({
      status: String(form.get('status')),
      body: String(form.get('body')),
    });
    if (!posted) {
      return;
    }
    formElement.reset();
    showToast('Update posted.');
    await refresh();
  }

  // Resolving is a timeline update like any other: the status transition and
  // the explanation readers get are the same act.
  async function resolve() {
    const posted = await postUpdate({
      status: 'RESOLVED',
      body: 'This incident has been resolved.',
    });
    setConfirmingResolve(false);
    if (!posted) {
      return;
    }
    showToast('Incident resolved.');
    await refresh();
  }

  if (loadError != null) {
    return (
      <>
        <PageHeader icon="alert-fill" trail={['Status', 'Incidents']} />
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
        <PageHeader icon="alert-fill" trail={['Status', 'Incidents']} />
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
                {/* Resolution goes through the Resolve button below, which is
                the one place that transition gets its confirmation. */}
                <Select
                  id="status"
                  name="status"
                  defaultValue={resolved ? undefined : incident.status}
                  options={INCIDENT_STATUSES.filter((status) => status !== 'RESOLVED').map(
                    (status) => ({
                      value: status,
                      label: incidentStatusPresentation[status].label,
                    }),
                  )}
                />
              </Field>
              <Field label="Update" htmlFor="body">
                <Textarea id="body" name="body" required />
              </Field>
              {formError != null && !confirmingResolve ? (
                <Text tone="caption">{formError}</Text>
              ) : null}
              <Button
                type="submit"
                loading={submitting && !confirmingResolve}
                loadingLabel="Posting"
              >
                Post update
              </Button>
              {resolved ? null : (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    setFormError(null);
                    setConfirmingResolve(true);
                  }}
                >
                  Resolve incident
                </Button>
              )}
            </Stack>
          </form>

          <Dialog
            open={confirmingResolve}
            title="Resolve incident?"
            onClose={() => setConfirmingResolve(false)}
            closeable={!submitting}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => setConfirmingResolve(false)}
                >
                  Cancel
                </Button>
                <Button
                  loading={submitting}
                  loadingLabel="Resolving"
                  onClick={() => void resolve()}
                >
                  Resolve
                </Button>
              </>
            }
          >
            <Text>
              This posts “This incident has been resolved.” to the public timeline and closes the
              incident.
            </Text>
          </Dialog>

          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
