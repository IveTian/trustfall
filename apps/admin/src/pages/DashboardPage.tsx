import {
  Badge,
  Button,
  EmptyState,
  Icon,
  PageBody,
  PageHeader,
  Panel,
  PanelHeader,
  PanelList,
  PanelRow,
  Skeleton,
  Stack,
  StatusSelect,
  Text,
  Toast,
} from '@trustfall/design';
import type { ComponentStatus } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Component = {
  id: string;
  display_name: string;
  description: string | null;
  status: ComponentStatus;
};

/** What the operator needs to know before reading a single row. */
function summarize(components: Component[]): string {
  const noun = components.length === 1 ? 'component' : 'components';
  const off = components.filter(
    (component) => component.status !== 'OPERATIONAL' && component.status !== 'STATUS_UNSPECIFIED',
  );
  const state = off.length === 0 ? 'all operational' : `${off.length} not operational`;
  return `${components.length} ${noun} · ${state}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  // `null` means the first load has not landed yet; an empty array is a real
  // "no components" answer.
  const [components, setComponents] = useState<Component[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // One entry per in-flight PATCH: a second component's update must not
  // re-enable the first while its request is still settling.
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const page = await api<Page<Component>>('/api/components');
      setComponents(page.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load components.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Declaring a status is an edit to the component, not a separate operation.
  async function setStatus(component: Component, status: ComponentStatus) {
    setPendingIds((prev) => new Set(prev).add(component.id));
    try {
      await api(`/api/components/${component.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update the status.');
      return;
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(component.id);
        return next;
      });
    }
    showToast(`Updated ${component.display_name}`);
    await refresh();
  }

  return (
    <>
      <PageHeader
        icon="dashboard-fill"
        trail={['Status', 'Dashboard']}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/components')}>
              Manage components
            </Button>
            <Button startEnhancer={<Icon name="add-fill" />} onClick={() => navigate('/incidents')}>
              Open an incident
            </Button>
          </>
        }
      />
      <PageBody>
        {loadError != null ? (
          <Stack gap={3} align="start">
            <Text tone="muted">{loadError}</Text>
            <Button variant="secondary" onClick={() => void refresh()}>
              Retry
            </Button>
          </Stack>
        ) : components == null ? (
          <Stack gap={3}>
            <Skeleton label="Loading components" />
            <Skeleton label="Loading components" />
          </Stack>
        ) : components.length === 0 ? (
          <EmptyState
            icon="stack-fill"
            title="No components yet"
            description="Publish the services people check on. Every component you add lands here with a status you can change in one move."
            actions={
              <Button
                startEnhancer={<Icon name="add-fill" />}
                onClick={() => navigate('/components')}
              >
                Add a component
              </Button>
            }
          />
        ) : (
          <Panel>
            <PanelHeader
              title="Components"
              caption="Change a component’s status without opening an incident."
              actions={<Badge>{summarize(components)}</Badge>}
            />
            <PanelList>
              {components.map((component) => (
                <PanelRow
                  key={component.id}
                  title={component.display_name}
                  description={component.description}
                  end={
                    <StatusSelect
                      status={component.status}
                      componentName={component.display_name}
                      disabled={pendingIds.has(component.id)}
                      onChange={(status) => void setStatus(component, status)}
                    />
                  }
                />
              ))}
            </PanelList>
          </Panel>
        )}
      </PageBody>
      <Toast message={toast} />
    </>
  );
}
