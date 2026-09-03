import {
  Avatar,
  Badge,
  Button,
  Dialog,
  Field,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  PanelList,
  PanelRow,
  RelativeTime,
  Skeleton,
  Stack,
  Text,
} from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api, type Page } from '../../lib/api.ts';
import { authClient, useSession } from '../../lib/auth.ts';

type Member = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: Date | string;
};

type InviteLink = {
  id: string;
  url: string;
  max_uses: number;
  use_count: number;
  remaining_uses: number;
  state: 'ACTIVE' | 'EXHAUSTED' | 'REVOKED';
  created_at: string;
};

/** Who can sign in to this console, and the links that let more people in. */
export function MembersSettings({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Stack gap={5}>
      <MembersPanel onToast={onToast} />
      <InviteLinksPanel onToast={onToast} />
    </Stack>
  );
}

const MEMBERS_PAGE_SIZE = 100;

function MembersPanel({ onToast }: { onToast: (message: string) => void }) {
  const { data } = useSession();
  const me = data?.user.id;
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const result = await authClient.admin.listUsers({
      query: { limit: MEMBERS_PAGE_SIZE, sortBy: 'createdAt', sortDirection: 'asc' },
    });
    if (result.error) {
      setLoadError(result.error.message ?? 'Could not load members.');
      return;
    }
    setMembers(result.data.users);
    setLoadError(null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmRemove() {
    if (removing == null) {
      return;
    }
    setSubmitting(true);
    const result = await authClient.admin.removeUser({ userId: removing.id });
    setSubmitting(false);
    if (result.error) {
      onToast(result.error.message ?? 'Could not remove the member.');
      return;
    }
    setRemoving(null);
    onToast('Member removed.');
    await load();
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Members"
          caption="Everyone who can sign in to this console. Every member can change anything here."
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
        ) : members == null ? (
          <PanelBody>
            <Skeleton label="Loading members" />
          </PanelBody>
        ) : (
          <PanelList>
            {members.map((member) => {
              const isMe = member.id === me;
              return (
                <PanelRow
                  key={member.id}
                  start={<Avatar name={member.name || member.email} image={member.image} />}
                  title={member.name || member.email}
                  description={
                    <>
                      {member.email} · Joined <RelativeTime value={member.createdAt} />
                    </>
                  }
                  end={
                    isMe ? (
                      <Badge>You</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setRemoving(member)}>
                        Remove
                      </Button>
                    )
                  }
                />
              );
            })}
          </PanelList>
        )}
      </Panel>
      <Dialog
        open={removing != null}
        title="Remove member?"
        onClose={() => setRemoving(null)}
        closeable={!submitting}
        actions={
          <>
            <Button variant="secondary" disabled={submitting} onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              loadingLabel="Removing"
              onClick={() => void confirmRemove()}
            >
              Remove
            </Button>
          </>
        }
      >
        <Text>
          {removing?.name || removing?.email} will be signed out and will no longer be able to sign
          in. They can register again with a new invite link.
        </Text>
      </Dialog>
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

function inviteState(link: InviteLink): string {
  return link.state === 'ACTIVE' ? 'Active' : link.state === 'EXHAUSTED' ? 'Spent' : 'Revoked';
}

const INVITE_FORM_ID = 'generateInviteForm';

/**
 * A collection page in miniature: the header carries the one primary action,
 * the list shows what exists, and the creation form waits in a dialog until
 * someone means to make a link.
 */
function InviteLinksPanel({ onToast }: { onToast: (message: string) => void }) {
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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

  function openCreate() {
    setMaxUses('1');
    setGenerateError(null);
    setCreating(true);
  }

  function closeCreate() {
    setCreating(false);
    setGenerateError(null);
  }

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
    try {
      await navigator.clipboard.writeText(created.url);
      onToast('Invite link copied.');
    } catch {
      onToast('Invite link created.');
    }
    closeCreate();
    await load();
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
      <Panel>
        <PanelHeader
          title="Invite links"
          caption="Public sign-up is closed. A link lets a fixed number of people register."
          actions={
            <Button size="sm" onClick={openCreate}>
              Generate link
            </Button>
          }
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
        ) : links == null ? (
          <PanelBody>
            <Skeleton label="Loading invite links" />
          </PanelBody>
        ) : links.length === 0 ? (
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
                    <Badge>{inviteState(link)}</Badge>
                    {link.state === 'ACTIVE' ? (
                      <Button variant="secondary" size="sm" onClick={() => void copyLink(link.url)}>
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
      <Dialog
        open={creating}
        title="Generate invite link"
        onClose={closeCreate}
        closeable={!generating}
        actions={
          <>
            <Button variant="secondary" disabled={generating} onClick={closeCreate}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={INVITE_FORM_ID}
              loading={generating}
              loadingLabel="Generating"
            >
              Generate link
            </Button>
          </>
        }
      >
        <form id={INVITE_FORM_ID} onSubmit={(event) => void onGenerate(event)}>
          <Stack gap={3}>
            <Field
              label="People who can register"
              htmlFor="maxUses"
              hint="How many accounts this link may create. The link is copied when it is generated."
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
            {generateError != null ? <Text tone="caption">{generateError}</Text> : null}
          </Stack>
        </form>
      </Dialog>
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
