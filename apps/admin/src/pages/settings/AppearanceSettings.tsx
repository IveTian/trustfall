import {
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  PanelList,
  PanelRow,
  type PublicComponent,
  type PublicServiceGroup,
  Skeleton,
  Stack,
  StatusPagePreview,
  Switch,
  Text,
} from '@trustfall/design';
import { type ComponentStatus, rollupOverallStatus } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';

type Settings = { site_name: string; site_description: string; show_status_history: boolean };

type StatusComponent = {
  id: string;
  display_name: string;
  description: string | null;
  status: ComponentStatus;
};
type StatusSnapshot = {
  component_groups: Array<{ id: string; display_name: string; components: StatusComponent[] }>;
  ungrouped_components: StatusComponent[];
};
type Tree = { groups: PublicServiceGroup[]; ungrouped: PublicComponent[] };

/** The snapshot as the public Status page shapes it: mirrors `apps/web/src/pages/status.astro`. */
function toTree(snapshot: StatusSnapshot): Tree {
  const toComponents = (components: StatusComponent[]): PublicComponent[] =>
    components.map((component) => ({
      id: component.id,
      displayName: component.display_name,
      description: component.description,
      status: component.status,
    }));
  return {
    groups: snapshot.component_groups
      .filter((group) => group.components.length > 0)
      .map((group) => {
        const components = toComponents(group.components);
        return {
          id: group.id,
          displayName: group.display_name,
          status: rollupOverallStatus(components.map((component) => component.status)),
          components,
        };
      }),
    ungrouped: toComponents(snapshot.ungrouped_components),
  };
}

/**
 * How the public Status page is drawn. The preview is the page itself,
 * rendered by the site's own components from the site's own services, so the
 * switch can be judged against what visitors will actually see. The switch
 * saves the moment it is flipped.
 */
export function AppearanceSettings({ onToast }: { onToast: (message: string) => void }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Fixed for the life of the screen so the preview's "today" does not drift.
  const [now] = useState(() => Date.now());

  async function load() {
    try {
      const [current, snapshot] = await Promise.all([
        api<Settings>('/api/settings'),
        api<StatusSnapshot>('/api/status'),
      ]);
      setSettings(current);
      setTree(toTree(snapshot));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load settings.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleHistory(showHistory: boolean) {
    if (!settings) {
      return;
    }
    const previous = settings;
    // Flip at once so the preview answers the switch; put it back if the save fails.
    setSettings({ ...settings, show_status_history: showHistory });
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api<Settings>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ show_status_history: showHistory }),
      });
      setSettings(updated);
    } catch (err) {
      setSettings(previous);
      setSaveError(err instanceof Error ? err.message : 'Could not save settings.');
      return;
    } finally {
      setSaving(false);
    }
    onToast(showHistory ? 'Status history is now shown.' : 'Status history is now hidden.');
  }

  return (
    <Stack gap={5}>
      <Panel>
        <PanelHeader
          title="Status page"
          caption="How each service is drawn on the public Status page."
        />
        {loadError != null ? (
          <PanelBody>
            <Stack gap={3} align="start">
              <Text tone="muted">{loadError}</Text>
              <Button variant="secondary" onClick={() => void load()}>
                Retry
              </Button>
            </Stack>
          </PanelBody>
        ) : settings == null || tree == null ? (
          <PanelBody>
            <Stack gap={3}>
              <Skeleton label="Loading settings" />
              <Skeleton label="Loading settings" />
            </Stack>
          </PanelBody>
        ) : (
          <>
            <PanelList>
              <PanelRow
                title="Show status history"
                description={
                  saveError ??
                  'Draws each service’s last 90 days as a bar, one rectangle per day, oldest on the left and today on the right.'
                }
                end={
                  <Switch
                    label="Show status history"
                    checked={settings.show_status_history}
                    disabled={saving}
                    onChange={(checked) => void toggleHistory(checked)}
                  />
                }
              />
            </PanelList>
            <PanelBody>
              <Stack gap={2}>
                <Text tone="label">Preview</Text>
                <StatusPagePreview
                  siteName={settings.site_name}
                  groups={tree.groups}
                  ungrouped={tree.ungrouped}
                  showHistory={settings.show_status_history}
                  now={now}
                />
              </Stack>
            </PanelBody>
          </>
        )}
      </Panel>
    </Stack>
  );
}
