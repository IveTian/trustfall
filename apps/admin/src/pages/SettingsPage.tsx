import {
  Button,
  Field,
  Input,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Toast,
} from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Settings = { site_name: string; site_description: string };

export function SettingsPage() {
  // `null` until the current values arrive: rendering an empty form first
  // would invite edits that the fetch then overwrites.
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, showToast] = useToast();

  async function load() {
    try {
      setSettings(await api<Settings>('/api/settings'));
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
    showToast('Saved settings.');
  }

  return (
    <>
      <PageHeader icon="settings-fill" trail={['Settings']} />
      <PageBody>
        <Stack gap={4}>
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
            <form onSubmit={onSubmit}>
              <Stack gap={3}>
                <Field label="Site name" htmlFor="siteName">
                  <Input
                    id="siteName"
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
                <Button type="submit" loading={saving} loadingLabel="Saving">
                  Save changes
                </Button>
              </Stack>
            </form>
          )}
          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
