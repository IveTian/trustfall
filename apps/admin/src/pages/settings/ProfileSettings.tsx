import {
  Avatar,
  Button,
  Dialog,
  Field,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  PanelList,
  PanelRow,
  Stack,
  Switch,
  Text,
} from '@trustfall/design';
import { type FormEvent, useState } from 'react';
import { authClient, useSession } from '../../lib/auth.ts';
import { gravatarUrl, isGravatarUrl } from '../../lib/gravatar.ts';

/** Your own account: the name others see, and the password only you know. */
export function ProfileSettings({ onToast }: { onToast: (message: string) => void }) {
  return (
    <Stack gap={5}>
      <NamePanel onToast={onToast} />
      <PicturePanel onToast={onToast} />
      <PasswordPanel onToast={onToast} />
    </Stack>
  );
}

function NamePanel({ onToast }: { onToast: (message: string) => void }) {
  const { data } = useSession();
  const user = data?.user;
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = name.trim();
  // Nothing to save until the name actually differs from what the account holds.
  const dirty = trimmed !== (user?.name ?? '');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmed) {
      setError('Enter a display name.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await authClient.updateUser({ name: trimmed });
    setSaving(false);
    if (result.error) {
      setError(result.error.message ?? 'Could not save your profile.');
      return;
    }
    onToast('Saved profile.');
  }

  return (
    <Panel>
      <PanelHeader title="Profile" caption="How you appear to other members of this workspace." />
      <PanelBody>
        <form onSubmit={(event) => void onSubmit(event)}>
          <Stack gap={3}>
            <Field label="Display name" htmlFor="displayName">
              <Input
                id="displayName"
                name="name"
                autoComplete="name"
                required
                disabled={saving}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Stack gap={1}>
              <Text tone="caption">Email</Text>
              <Text>{user?.email}</Text>
              <Text tone="caption">You sign in with this address. It cannot be changed here.</Text>
            </Stack>
            {error != null ? <Text tone="caption">{error}</Text> : null}
            <Stack direction="horizontal" gap={2}>
              <Button type="submit" disabled={!dirty} loading={saving} loadingLabel="Saving">
                Save profile
              </Button>
            </Stack>
          </Stack>
        </form>
      </PanelBody>
    </Panel>
  );
}

/**
 * Gravatar is a third party that learns a hash of your email the moment the
 * picture is requested, so it is off until you turn it on — and only for you.
 */
function PicturePanel({ onToast }: { onToast: (message: string) => void }) {
  const { data } = useSession();
  const user = data?.user;
  const enabled = isGravatarUrl(user?.image);
  const [pending, setPending] = useState(false);

  async function setEnabled(next: boolean) {
    if (!user) {
      return;
    }
    setPending(true);
    const image = next ? await gravatarUrl(user.email) : null;
    const result = await authClient.updateUser({ image });
    setPending(false);
    if (result.error) {
      onToast(result.error.message ?? 'Could not update your picture.');
      return;
    }
    onToast(next ? 'Gravatar turned on.' : 'Gravatar turned off.');
  }

  return (
    <Panel>
      <PanelHeader title="Picture" caption="Shown beside your name in the console." />
      <PanelList>
        <PanelRow
          start={<Avatar name={user?.name || 'Account'} image={user?.image} />}
          title="Use Gravatar"
          description="The picture registered for your email at gravatar.com. Without one, your initials stay."
          end={
            <Switch
              label="Use Gravatar"
              checked={enabled}
              disabled={pending || !user}
              onChange={(next) => void setEnabled(next)}
            />
          }
        />
      </PanelList>
    </Panel>
  );
}

const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_FORM_ID = 'changePasswordForm';

/**
 * Changing a password is rare and deliberate, so the fields wait in a dialog
 * behind one row; the page itself never shows three empty password boxes.
 */
function PasswordPanel({ onToast }: { onToast: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const currentPassword = String(fields.get('currentPassword'));
    const newPassword = String(fields.get('newPassword'));
    const confirmPassword = String(fields.get('confirmPassword'));

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    setError(null);
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      // A changed password should end any session that still holds the old one.
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error.message ?? 'Could not change your password.');
      return;
    }
    close();
    onToast('Password changed.');
  }

  return (
    <>
      <Panel>
        <PanelHeader title="Security" />
        <PanelList>
          <PanelRow
            title="Password"
            description="Changing it signs you out everywhere except this browser."
            end={
              <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                Change password
              </Button>
            }
          />
        </PanelList>
      </Panel>
      <Dialog
        open={open}
        title="Change password"
        onClose={close}
        closeable={!saving}
        // Three typed fields are worth more than a stray click on the backdrop.
        closeOnBackdrop={false}
        actions={
          <>
            <Button variant="secondary" disabled={saving} onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={PASSWORD_FORM_ID} loading={saving} loadingLabel="Changing">
              Change password
            </Button>
          </>
        }
      >
        <form id={PASSWORD_FORM_ID} onSubmit={(event) => void onSubmit(event)}>
          <Stack gap={3}>
            <Field label="Current password" htmlFor="currentPassword">
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                disabled={saving}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="newPassword"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            >
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={saving}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="confirmPassword">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                disabled={saving}
              />
            </Field>
            {error != null ? <Text tone="caption">{error}</Text> : null}
          </Stack>
        </form>
      </Dialog>
    </>
  );
}
