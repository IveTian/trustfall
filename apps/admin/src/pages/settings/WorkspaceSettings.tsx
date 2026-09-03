import {
  Button,
  Field,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Skeleton,
  Stack,
  Text,
  Textarea,
} from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';

type Settings = { site_name: string; site_description: string };

/** The workspace as visitors meet it: what the status page calls itself. */
export function WorkspaceSettings({ onToast }: { onToast: (message: string) => void }) {
  // `null` until the current values arrive: rendering an empty form first
  // would invite edits that the fetch then overwrites.
  const [settings, setSettings] = useState<Settings | null>(null);
  // What the server holds, so Save only lights up once something differs.
  const [saved, setSaved] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    try {
      const current = await api<Settings>('/api/settings');
      setSettings(current);
      setSaved(current);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load settings.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) {
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await api('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save settings.');
      return;
    } finally {
      setSaving(false);
    }
    setSaved(settings);
    onToast('Saved workspace settings.');
  }

  const dirty =
    settings != null &&
    saved != null &&
    (settings.site_name !== saved.site_name ||
      settings.site_description !== saved.site_description);

  return (
    <Stack gap={5}>
      <Panel>
        <PanelHeader
          title="Status page"
          caption="The name and description shown at the top of the public page."
        />
        <PanelBody>
          {loadError != null ? (
            <Stack gap={3} align="start">
              <Text tone="muted">{loadError}</Text>
              <Button variant="secondary" onClick={() => void load()}>
                Retry
              </Button>
            </Stack>
          ) : settings == null ? (
            <Stack gap={3}>
              <Skeleton label="Loading settings" />
              <Skeleton label="Loading settings" />
            </Stack>
          ) : (
            <form onSubmit={(event) => void onSubmit(event)}>
              <Stack gap={3}>
                <Field label="Site name" htmlFor="siteName">
                  <Input
                    id="siteName"
                    required
                    disabled={saving}
                    value={settings.site_name}
                    onChange={(event) =>
                      setSettings({ ...settings, site_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Description" htmlFor="siteDescription">
                  <Textarea
                    id="siteDescription"
                    disabled={saving}
                    value={settings.site_description}
                    onChange={(event) =>
                      setSettings({ ...settings, site_description: event.target.value })
                    }
                  />
                </Field>
                {saveError != null ? <Text tone="caption">{saveError}</Text> : null}
                <Stack direction="horizontal" gap={2}>
                  <Button type="submit" disabled={!dirty} loading={saving} loadingLabel="Saving">
                    Save changes
                  </Button>
                </Stack>
              </Stack>
            </form>
          )}
        </PanelBody>
      </Panel>
    </Stack>
  );
}
