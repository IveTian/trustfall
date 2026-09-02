import { Button, Field, Icon, Input, Link, Stack, Text } from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../lib/api.ts';
import { signIn } from '../lib/auth.ts';

type PublicInvite = { state: 'ACTIVE' | 'EXHAUSTED' | 'REVOKED'; remaining_uses: number };

export function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('invite') ?? '';
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    void api<PublicInvite>(`/api/invite-links/preview?token=${encodeURIComponent(token)}`)
      .then((result) => {
        if (!cancelled) {
          setInvite(result);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'This invite link is not valid.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    try {
      await api('/api/invite-links/register', {
        method: 'POST',
        body: JSON.stringify({
          token,
          email,
          password,
          display_name: form.get('display_name'),
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
      setPending(false);
      return;
    }
    const signedIn = await signIn.email({ email, password });
    navigate(signedIn.error ? '/login' : '/', { replace: true });
  }

  if (!token) {
    return (
      <Stack gap={5} grow justify="between">
        <Stack gap={2}>
          <Text as="h1" tone="title">
            Invite required
          </Text>
          <Text tone="muted">This invite link is missing a token.</Text>
        </Stack>
        <Link href="/admin/login">Sign in</Link>
      </Stack>
    );
  }

  if (loadError != null) {
    return (
      <Stack gap={5} grow justify="between">
        <Stack gap={2}>
          <Text as="h1" tone="title">
            Invite required
          </Text>
          <Text tone="muted">{loadError}</Text>
        </Stack>
        <Link href="/admin/login">Sign in</Link>
      </Stack>
    );
  }

  if (invite == null) {
    return (
      <Stack gap={5} grow justify="between">
        <Stack gap={2}>
          <Text as="h1" tone="title">
            Create an account
          </Text>
          <Text tone="muted">Checking this invite link.</Text>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack gap={5} grow justify="between">
      <Stack gap={2}>
        <Text as="h1" tone="title">
          Create an account
        </Text>
        <Text tone="muted">
          {invite.remaining_uses === 1
            ? 'This invite can be used once.'
            : `This invite can be used ${invite.remaining_uses} more times.`}
        </Text>
      </Stack>
      <form onSubmit={onSubmit}>
        <Stack gap={4}>
          <Field label="Your name" htmlFor="display-name">
            <Input id="display-name" name="display_name" required autoComplete="name" />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </Field>
          {error ? <Text tone="caption">{error}</Text> : null}
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            loadingLabel="Creating account"
            endEnhancer={<Icon name="arrow-right-fill" />}
          >
            Create account
          </Button>
          <Link href="/admin/login">Sign in instead</Link>
        </Stack>
      </form>
    </Stack>
  );
}
