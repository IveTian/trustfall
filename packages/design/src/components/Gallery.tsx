import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES, INCIDENT_IMPACTS, INCIDENT_STATUSES } from '@trustfall/shared';
import { useState } from 'react';
import { Button, IconButton } from './Button.tsx';
import { Card } from './Card.tsx';
import { Checkbox } from './Checkbox.tsx';
import { DiffBlock } from './Diff.tsx';
import { EmptyState } from './EmptyState.tsx';
import { Field, Input, Textarea } from './Field.tsx';
import { Select } from './Select.tsx';
import { Icon } from './Icon.tsx';
import { PageColumns } from './PageColumns.tsx';
import { RichTextBody } from './RichTextBody.tsx';
import { RichTextEditor } from './RichTextEditor.tsx';
import { Panel, PanelHeader, PanelList, PanelRow } from './Panel.tsx';
import { SectionNav, SectionNavItem } from './SectionNav.tsx';
import { componentStatusPresentation } from '../status.ts';
import { StatusIcon } from './StatusIcon.tsx';
import { TreeChevron, TreeEmpty, TreeList, TreeNest, TreeRow } from './TreeList.tsx';
import { AffectedComponentsChart } from './AffectedComponentsChart.tsx';
import { IncidentTimeline } from './IncidentTimeline.tsx';
import { Stack } from './Stack.tsx';
import { StatusPill } from './StatusPill.tsx';
import { StatusSelect } from './StatusSelect.tsx';
import { Text } from './Text.tsx';

const SAMPLE_MARKDOWN = [
  'We are seeing **elevated error rates** on the *EU* cluster — roughly `2%` of requests.',
  '',
  '- API responses may be slow',
  '- Webhooks are delayed',
  '',
  '> Mitigation is underway; the next update lands within 30 minutes.',
  '',
  'Details in the [status runbook](https://example.com/runbook).',
].join('\n');

const SAMPLE_ROWS = [
  { id: 'web', name: 'Web application', description: 'Dashboard, sign-in, and the status page.' },
  { id: 'api', name: 'Public API', description: 'REST endpoints under api.example.com.' },
];

/** The dashboard sandwich, wired to local state so the gallery is live. */
function SandwichDemo() {
  const [section, setSection] = useState('now');
  const [expanded, setExpanded] = useState(false);
  const [apiStatus, setApiStatus] = useState<ComponentStatus>('OPERATIONAL');
  const worst = componentStatusPresentation.DEGRADED_PERFORMANCE;
  return (
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
      aside={
        <Stack gap={3}>
          <Text as="h2" tone="label">
            Components
          </Text>
          <TreeList>
            <TreeRow
              title="Public API"
              start={
                <StatusSelect
                  compact
                  status={apiStatus}
                  componentName="Public API"
                  onChange={setApiStatus}
                />
              }
            />
            <TreeRow
              title="CN region"
              start={<StatusIcon icon={worst.icon} tone={worst.tone} title={worst.label} />}
              onClick={() => setExpanded((prev) => !prev)}
              expanded={expanded}
              end={<TreeChevron open={expanded} />}
              nest={
                <TreeNest open={expanded}>
                  <TreeRow
                    title="API CN"
                    start={<StatusIcon icon={worst.icon} tone={worst.tone} title={worst.label} />}
                  />
                </TreeNest>
              }
            />
          </TreeList>
        </Stack>
      }
    >
      <EmptyState
        icon="flashlight-line"
        title="New incidents will appear here"
        description="When something breaks, open an incident and its timeline lands on this screen."
        actions={<Button startEnhancer={<Icon name="add-fill" />}>Open an incident</Button>}
      />
    </PageColumns>
  );
}

/** The console's status control, wired to local state so the gallery is live. */
function StatusRow({ name, description }: { name: string; description: string }) {
  const [status, setStatus] = useState<ComponentStatus>('OPERATIONAL');
  return (
    <PanelRow
      title={name}
      description={description}
      end={<StatusSelect status={status} componentName={name} onChange={setStatus} />}
    />
  );
}

const SAMPLE_START = Date.UTC(2026, 8, 2, 11, 38);

const SAMPLE_UPDATES = [
  {
    id: 'upd_3',
    status: 'RESOLVED' as const,
    body: 'The fix has held for thirty minutes. This incident is resolved.',
    createTime: SAMPLE_START + 50 * 60 * 1000,
    components: [
      { componentId: 'api', displayName: 'Public API', status: 'OPERATIONAL' as const },
      { componentId: 'cdn', displayName: 'China CDN', status: 'OPERATIONAL' as const },
    ],
  },
  {
    id: 'upd_2',
    status: 'IDENTIFIED' as const,
    body: 'A bad deploy to the edge tier. Rolling back now.',
    createTime: SAMPLE_START + 12 * 60 * 1000,
    components: [
      { componentId: 'api', displayName: 'Public API', status: 'DEGRADED_PERFORMANCE' as const },
      { componentId: 'cdn', displayName: 'China CDN', status: 'MAJOR_OUTAGE' as const },
    ],
  },
  {
    id: 'upd_1',
    status: 'INVESTIGATING' as const,
    body: 'We are seeing elevated error rates and are looking into it.',
    createTime: SAMPLE_START,
    components: [
      { componentId: 'cdn', displayName: 'China CDN', status: 'PARTIAL_OUTAGE' as const },
    ],
  },
];

export function DesignGallery() {
  return (
    <Stack gap={6}>
      <Text as="h1" tone="display">
        TrustFall gallery
      </Text>
      <Text tone="muted">
        Tokens, status mappings, and primitives. Check each component against CHECKLIST.md before
        shipping it.
      </Text>

      <Card>
        <Stack gap={3}>
          <Text as="h2" tone="title">
            Component status
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
            {COMPONENT_STATUSES.filter((status) => status !== 'STATUS_UNSPECIFIED').map(
              (status) => (
                <StatusPill key={status} status={status as ComponentStatus} />
              ),
            )}
          </Stack>
          <Text as="h2" tone="title">
            Incident status
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
            {INCIDENT_STATUSES.map((status) => (
              <StatusPill key={status} status={status} kind="incident" />
            ))}
          </Stack>
          <Text as="h2" tone="title">
            Impact
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
            {INCIDENT_IMPACTS.map((impact) => (
              <StatusPill key={impact} status={impact} kind="impact" />
            ))}
          </Stack>
        </Stack>
      </Card>

      <Card>
        <Stack gap={3}>
          <Text as="h2" tone="title">
            Controls
          </Text>
          <Stack direction="horizontal" gap={2} wrap>
            <Button>Save changes</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="danger">Resolve incident</Button>
            <Button variant="ghost">Sign out</Button>
          </Stack>
          <Button size="lg" fullWidth endEnhancer={<Icon name="arrow-right-fill" />}>
            Continue
          </Button>
          <Field label="Display name" htmlFor="gallery-name">
            <Input id="gallery-name" defaultValue="API" />
          </Field>
          <Field label="Update" htmlFor="gallery-update">
            <Textarea
              id="gallery-update"
              defaultValue="We are investigating elevated error rates."
            />
          </Field>
          <Field label="Status" htmlFor="gallery-status">
            <Select
              id="gallery-status"
              defaultValue="OPERATIONAL"
              options={[
                { value: 'OPERATIONAL', label: 'Operational' },
                { value: 'DEGRADED_PERFORMANCE', label: 'Degraded performance' },
              ]}
            />
          </Field>
          <Checkbox label="API" defaultChecked />
          <Checkbox label="Dashboard" />
        </Stack>
      </Card>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Console list
        </Text>
        <Text tone="muted">
          A hairline panel with full-bleed rows. The status menu replaces a native select so the
          popup follows the theme.
        </Text>
        <Panel>
          <PanelHeader title="Components" caption="Two services, one control each." />
          <PanelList>
            {SAMPLE_ROWS.map((row) => (
              <StatusRow key={row.id} name={row.name} description={row.description} />
            ))}
          </PanelList>
        </Panel>
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Dashboard sandwich
        </Text>
        <Text tone="muted">
          Section nav on the start edge, the reading column in the middle, the component rail on the
          end edge. Groups fold closed; the compact status control is the icon itself.
        </Text>
        <SandwichDemo />
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Orderable tree
        </Text>
        <Text tone="muted">
          The components console: draggable rows, a group as a folder row with its members nested
          inset, actions as quiet icons on the end edge.
        </Text>
        <TreeList>
          <TreeRow
            title="Web application"
            description="Dashboard, sign-in, and the status page."
            handle
            end={
              <>
                <StatusPill status="OPERATIONAL" />
                <IconButton label="Delete Web application">
                  <Icon name="delete-bin-line" size={16} />
                </IconButton>
              </>
            }
          />
          <TreeRow
            title="Public API"
            description="REST endpoints under api.example.com."
            handle
            end={
              <>
                <StatusPill status="DEGRADED_PERFORMANCE" />
                <IconButton label="Delete Public API">
                  <Icon name="delete-bin-line" size={16} />
                </IconButton>
              </>
            }
          />
          <TreeRow
            title="CN region"
            icon="folder-line"
            handle
            end={
              <>
                <IconButton label="Rename CN region">
                  <Icon name="pencil-line" size={16} />
                </IconButton>
                <IconButton label="Delete CN region">
                  <Icon name="delete-bin-line" size={16} />
                </IconButton>
              </>
            }
            nest={
              <TreeNest>
                <TreeRow
                  title="API CN"
                  handle
                  end={
                    <>
                      <StatusPill status="OPERATIONAL" />
                      <IconButton label="Delete API CN">
                        <Icon name="delete-bin-line" size={16} />
                      </IconButton>
                    </>
                  }
                />
                <TreeRow
                  title="China CDN"
                  handle
                  end={
                    <>
                      <StatusPill status="MAJOR_OUTAGE" />
                      <IconButton label="Delete China CDN">
                        <Icon name="delete-bin-line" size={16} />
                      </IconButton>
                    </>
                  }
                />
              </TreeNest>
            }
          />
          <TreeRow
            title="EU region"
            icon="folder-line"
            handle
            end={
              <>
                <IconButton label="Rename EU region">
                  <Icon name="pencil-line" size={16} />
                </IconButton>
                <IconButton label="Delete EU region">
                  <Icon name="delete-bin-line" size={16} />
                </IconButton>
              </>
            }
            nest={
              <TreeNest>
                <TreeEmpty>No components in this group yet.</TreeEmpty>
              </TreeNest>
            }
          />
        </TreeList>
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Rich text
        </Text>
        <Text tone="muted">
          The incident message editor and the rendered body it produces. Eight tools, markdown
          underneath, nothing a status update does not need.
        </Text>
        <RichTextEditor name="gallery-message" defaultValue={SAMPLE_MARKDOWN} />
        <Card>
          <RichTextBody markdown={SAMPLE_MARKDOWN} />
        </Card>
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Diff
        </Text>
        <Text tone="muted">
          A review screen&apos;s answer to &quot;what exactly will this do&quot;: red leaves, green
          arrives, plain stands still.
        </Text>
        <DiffBlock
          lines={[
            { kind: 'removed', text: 'Investigating' },
            { kind: 'added', text: 'Monitoring' },
            { kind: 'context', text: 'Public API: Degraded performance' },
            { kind: 'removed', text: 'China CDN: Partial outage' },
            { kind: 'added', text: 'China CDN: Full outage' },
          ]}
        />
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Incident timeline
        </Text>
        <Text tone="muted">
          The incident&apos;s story newest first, and how each component fared while it ran. The
          chart draws the affected set every update left behind.
        </Text>
        <IncidentTimeline updates={SAMPLE_UPDATES} />
        <AffectedComponentsChart
          components={[
            { id: 'api', displayName: 'Public API', status: 'OPERATIONAL' },
            { id: 'cdn', displayName: 'China CDN', status: 'OPERATIONAL', group: 'China' },
          ]}
          updates={SAMPLE_UPDATES}
          startTime={SAMPLE_START}
          endTime={SAMPLE_START + 50 * 60 * 1000}
          now={SAMPLE_START + 50 * 60 * 1000}
        />
      </Stack>

      <Stack gap={3}>
        <Text as="h2" tone="title">
          Empty state
        </Text>
        <Card>
          <EmptyState
            icon="stack-fill"
            title="No components yet"
            description="Name what is missing, say what it will do, offer one way to start."
            actions={<Button startEnhancer={<Icon name="add-fill" />}>Add a component</Button>}
          />
        </Card>
      </Stack>
    </Stack>
  );
}
