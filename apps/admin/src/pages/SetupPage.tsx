import { Button, Field, Icon, Input, Stack, Text } from '@trustfall/design';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api.ts';
import { signIn } from '../lib/auth.ts';
import { useSetup } from '../lib/setup.tsx';

export function SetupPage() {
  const navigate = useNavigate();
  const { markInitialized } = useSetup();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    try {
      await api('/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          display_name: form.get('display_name'),
          site_name: form.get('site_name'),
          site_description: form.get('site_description') || undefined,
        }),
      });
      // Sign the new owner in before flipping the cached setup answer, so the
      // gate lands them in the dashboard instead of an empty login form.
      const signedIn = await signIn.email({ email, password });
      markInitialized();
      navigate(signedIn.error ? '/login' : '/', { replace: true });
    } catch (err) {
      // The owner may exist even though this call failed — a resubmitted form
      // is the usual cause. Ask the server rather than leaving the user on a
      // page that can never succeed.
      const status = await api<{ initialized: boolean }>('/api/setup').catch(() => null);
      if (status?.initialized) {
        markInitialized();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not finish setup.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap={5} grow justify="between">
      <Stack gap={2}>
        <Text as="h1" tone="title">
          Set up TrustFall
        </Text>
        <Text tone="muted">
          Create the owner account. Public sign-up stays closed after this; invite others from
          Settings.
        </Text>
      </Stack>
      <form onSubmit={onSubmit}>
        <Stack gap={4}>
          <Field label="Site name" htmlFor="site-name">
            <Input id="site-name" name="site_name" required defaultValue="TrustFall" />
          </Field>
          <Field label="Site description" htmlFor="site-description">
            <Input id="site-description" name="site_description" />
          </Field>
          <Field label="Your name" htmlFor="display-name">
            <Input id="display-name" name="display_name" required />
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
            loadingLabel="Creating owner"
            endEnhancer={<Icon name="arrow-right-fill" />}
          >
            Create owner account
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
