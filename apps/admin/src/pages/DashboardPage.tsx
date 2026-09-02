import {
  Button,
  Card,
  componentStatusPresentation,
  EmptyState,
  Icon,
  PageBody,
  PageColumns,
  PageHeader,
  RelativeTime,
  RichTextBody,
  SectionNav,
  SectionNavItem,
  Skeleton,
  Stack,
  StatusIcon,
  StatusPill,
  StatusSelect,
  Text,
  Toast,
  TreeChevron,
  TreeEmpty,
  TreeList,
  TreeNest,
  TreeRow,
} from '@trustfall/design';
import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Group = { id: string; display_name: string; description: string | null; position: number };
type Component = {
  id: string;
  display_name: string;
  description: string | null;
  status: ComponentStatus;
  group_id: string | null;
  position: number;
};
type Incident = {
  id: string;
  title: string;
  status: IncidentStatus;
  impact: IncidentImpact;
  // Newest first; the first entry is the incident's latest word.
  updates: Array<{ id: string; body: string; created_at: string }>;
};

const absoluteTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type Section = 'now' | 'past' | 'maintenance';

function byPosition(a: { position: number; display_name: string }, b: typeof a) {
  return a.position - b.position || a.display_name.localeCompare(b.display_name);
}

/** The group wears its worst member's status; severity follows the enum order. */
function worstStatus(members: Component[]): ComponentStatus {
  let worst: ComponentStatus = 'OPERATIONAL';
  for (const member of members) {
    if (COMPONENT_STATUSES.indexOf(member.status) > COMPONENT_STATUSES.indexOf(worst)) {
      worst = member.status;
    }
  }
  return worst;
}

export function DashboardPage() {
  const navigate = useNavigate();
  // `null` means the first load has not landed yet; an empty array is a real
  // "nothing here" answer.
  const [components, setComponents] = useState<Component[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('now');
  // Groups fold closed by default; the rail is a glance, not an inventory.
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set());
  // One entry per in-flight PATCH: a second component's update must not
  // re-enable the first while its request is still settling.
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [toast, showToast] = useToast();

  async function refresh() {
    try {
      const [groupPage, componentPage, incidentPage] = await Promise.all([
        api<Page<Group>>('/api/component-groups'),
        api<Page<Component>>('/api/components'),
        api<Page<Incident>>('/api/incidents'),
      ]);
      setGroups(groupPage.items);
      setComponents(componentPage.items);
      setIncidents(incidentPage.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load the dashboard.');
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

  // A component whose group vanished between loads still shows up: it lands in
  // the ungrouped rows rather than disappearing from the console.
  function groupIdOf(component: Component): string | null {
    return groups.some((group) => group.id === component.group_id) ? component.group_id : null;
  }

  function membersOf(groupId: string | null): Component[] {
    return (components ?? []).filter((c) => groupIdOf(c) === groupId).sort(byPosition);
  }

  const sortedGroups = [...groups].sort(byPosition);
  const ungrouped = membersOf(null);
  const openIncidents = (incidents ?? []).filter((incident) => incident.status !== 'RESOLVED');
  const pastIncidents = (incidents ?? []).filter((incident) => incident.status === 'RESOLVED');

  function railRow(component: Component) {
    return (
      <TreeRow
        key={component.id}
        title={component.display_name}
        start={
          <StatusSelect
            compact
            status={component.status}
            componentName={component.display_name}
            disabled={pendingIds.has(component.id)}
            onChange={(status) => void setStatus(component, status)}
          />
        }
      />
    );
  }

  function incidentCard(incident: Incident) {
    const latest = incident.updates[0];
    return (
      <Card key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
        <Stack gap={2}>
          <Stack direction="horizontal" justify="between" gap={3}>
            <Text tone="label">{incident.title}</Text>
            <Text tone="muted" as="span">
              <Icon name="arrow-right-line" size={16} />
            </Text>
          </Stack>
          <Stack direction="horizontal" gap={2}>
            <StatusPill status={incident.status} kind="incident" />
            <StatusPill status={incident.impact} kind="impact" />
          </Stack>
          {latest ? (
            <>
              <RichTextBody markdown={latest.body} size="small" muted />
              <Text tone="caption">
                {absoluteTime.format(new Date(latest.created_at))} ·{' '}
                <RelativeTime value={latest.created_at} />
              </Text>
            </>
          ) : null}
        </Stack>
      </Card>
    );
  }

  const sectionContent =
    section === 'now' ? (
      <Stack gap={3}>
        <Text as="h2" tone="label">
          Happening now
        </Text>
        {openIncidents.length === 0 ? (
          <EmptyState
            icon="flashlight-line"
            title="New incidents will appear here"
            description="When something breaks, open an incident and its timeline lands on this screen."
            actions={
              <Button
                startEnhancer={<Icon name="add-fill" />}
                onClick={() => navigate('/incidents')}
              >
                Open an incident
              </Button>
            }
          />
        ) : (
          openIncidents.map(incidentCard)
        )}
      </Stack>
    ) : section === 'past' ? (
      <Stack gap={3}>
        <Text as="h2" tone="label">
          Past incidents
        </Text>
        {pastIncidents.length === 0 ? (
          <EmptyState
            icon="history-line"
            title="No past incidents"
            description="Resolved incidents land here, newest first."
          />
        ) : (
          pastIncidents.map(incidentCard)
        )}
      </Stack>
    ) : (
      <Stack gap={3}>
        <Text as="h2" tone="label">
          Maintenance
        </Text>
        <EmptyState
          icon="hammer-line"
          title="No scheduled maintenance"
          description="Planned maintenance windows will appear here."
        />
      </Stack>
    );

  const rail = (
    <Stack gap={3}>
      <Text as="h2" tone="label">
        Components
      </Text>
      {components != null && components.length === 0 ? (
        <Stack gap={3} align="start">
          <Text tone="muted">No components yet.</Text>
          <Button variant="secondary" onClick={() => navigate('/components')}>
            Add a component
          </Button>
        </Stack>
      ) : (
        <TreeList>
          {ungrouped.map(railRow)}
          {sortedGroups.map((group) => {
            const members = membersOf(group.id);
            const expanded = expandedGroups.has(group.id);
            const worst = componentStatusPresentation[worstStatus(members)];
            return (
              <TreeRow
                key={group.id}
                title={group.display_name}
                start={<StatusIcon icon={worst.icon} tone={worst.tone} title={worst.label} />}
                onClick={() => toggleGroup(group.id)}
                expanded={expanded}
                end={<TreeChevron open={expanded} />}
                nest={
                  <TreeNest open={expanded}>
                    {members.length === 0 ? (
                      <TreeEmpty>No components in this group yet.</TreeEmpty>
                    ) : (
                      members.map(railRow)
                    )}
                  </TreeNest>
                }
              />
            );
          })}
        </TreeList>
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader
        icon="dashboard-fill"
        trail={['Dashboard']}
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
      <PageBody wide>
        {loadError != null ? (
          <Stack gap={3} align="start">
            <Text tone="muted">{loadError}</Text>
            <Button variant="secondary" onClick={() => void refresh()}>
              Retry
            </Button>
          </Stack>
        ) : components == null || incidents == null ? (
          <Stack gap={3}>
            <Skeleton label="Loading the dashboard" />
            <Skeleton label="Loading the dashboard" />
          </Stack>
        ) : (
          <PageColumns
            nav={
              <SectionNav>
                <SectionNavItem
                  icon="flashlight-line"
                  active={section === 'now'}
                  onClick={() => setSection('now')}
                >
                  Happening now
                </SectionNavItem>
                <SectionNavItem
                  icon="history-line"
                  active={section === 'past'}
                  onClick={() => setSection('past')}
                >
                  Past events
                </SectionNavItem>
                <SectionNavItem
                  icon="hammer-line"
                  active={section === 'maintenance'}
                  onClick={() => setSection('maintenance')}
                >
                  Maintenance
                </SectionNavItem>
              </SectionNav>
            }
            aside={rail}
          >
            {sectionContent}
          </PageColumns>
        )}
      </PageBody>
      <Toast message={toast} />
    </>
  );
}
