import {
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  PageBody,
  PageHeader,
  Panel,
  PanelHeader,
  PanelList,
  PanelRow,
  RelativeTime,
  Skeleton,
  Stack,
  Text,
  Textarea,
  Toast,
} from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api, type Page } from '../lib/api.ts';
import { useToast } from '../lib/toast.ts';

type Settings = { site_name: string; site_description: string };

type InviteLink = {
  id: string;
  url: string;
  max_uses: number;
  use_count: number;
  remaining_uses: number;
  state: 'ACTIVE' | 'EXHAUSTED' | 'REVOKED';
  created_at: string;
};

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
        <Stack gap={5}>
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
          <InviteLinksPanel onToast={showToast} />
          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}

function inviteTitle(link: InviteLink): string {
  if (link.state === 'REVOKED') {
    return 'Revoked';
  }
  if (link.state === 'EXHAUSTED') {
    return `All ${link.max_uses} uses spent`;
  }
  return `${link.remaining_uses} of ${link.max_uses} uses remaining`;
}

function InviteLinksPanel({ onToast }: { onToast: (message: string) => void }) {
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState('1');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<InviteLink | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const page = await api<Page<InviteLink>>('/api/invite-links');
      setLinks(page.items);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load invite links.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    let created: InviteLink;
    try {
      created = await api<InviteLink>('/api/invite-links', {
        method: 'POST',
        body: JSON.stringify({ max_uses: Number(maxUses) }),
      });
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Could not generate a link.');
      setGenerating(false);
      return;
    }
    setGenerating(false);
    await load();
    try {
      await navigator.clipboard.writeText(created.url);
      onToast('Invite link copied.');
    } catch {
      onToast('Invite link created.');
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      onToast('Invite link copied.');
    } catch {
      onToast('Could not copy the link.');
    }
  }

  async function confirmRevoke() {
    if (revoking == null) {
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/invite-links/${revoking.id}/revoke`, { method: 'POST' });
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not revoke the link.');
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setRevoking(null);
    onToast('Invite link revoked.');
    await load();
  }

  return (
    <>
      <Stack gap={3}>
        <form onSubmit={(event) => void onGenerate(event)}>
          <Stack gap={3}>
            <Field
              label="People who can register"
              htmlFor="maxUses"
              hint="How many accounts this link may create."
            >
              <Input
                id="maxUses"
                type="number"
                min={1}
                max={10000}
                required
                value={maxUses}
                disabled={generating}
                onChange={(event) => setMaxUses(event.target.value)}
              />
            </Field>
            <Button type="submit" loading={generating} loadingLabel="Generating">
              Generate link
            </Button>
          </Stack>
        </form>
        {generateError != null ? <Text tone="caption">{generateError}</Text> : null}
        {loadError != null ? (
          <Stack gap={3} align="start">
            <Text tone="muted">{loadError}</Text>
            <Button variant="secondary" onClick={() => void load()}>
              Retry
            </Button>
          </Stack>
        ) : links == null ? (
          <Skeleton label="Loading invite links" />
        ) : (
          <Panel>
            <PanelHeader
              title="Invite links"
              caption="Public sign-up is closed. Generate a link and say how many people may use it."
            />
            {links.length === 0 ? (
              <PanelList>
                <PanelRow
                  title="No invite links yet"
                  description="Generate one to let someone register."
                />
              </PanelList>
            ) : (
              <PanelList>
                {links.map((link) => (
                  <PanelRow
                    key={link.id}
                    title={inviteTitle(link)}
                    description={
                      <>
                        Created <RelativeTime value={link.created_at} />
                      </>
                    }
                    end={
                      <Stack direction="horizontal" gap={2} wrap>
                        <Badge>
                          {link.state === 'ACTIVE'
                            ? 'Active'
                            : link.state === 'EXHAUSTED'
                              ? 'Spent'
                              : 'Revoked'}
                        </Badge>
                        {link.state === 'ACTIVE' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void copyLink(link.url)}
                          >
                            Copy link
                          </Button>
                        ) : null}
                        {link.state !== 'REVOKED' ? (
                          <Button variant="ghost" size="sm" onClick={() => setRevoking(link)}>
                            Revoke
                          </Button>
                        ) : null}
                      </Stack>
                    }
                  />
                ))}
              </PanelList>
            )}
          </Panel>
        )}
      </Stack>
      <Dialog
        open={revoking != null}
        title="Revoke invite link?"
        onClose={() => setRevoking(null)}
        closeable={!submitting}
        actions={
          <>
            <Button variant="secondary" disabled={submitting} onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              loadingLabel="Revoking"
              onClick={() => void confirmRevoke()}
            >
              Revoke
            </Button>
          </>
        }
      >
        <Text>People with this link will no longer be able to create an account.</Text>
      </Dialog>
    </>
  );
}
