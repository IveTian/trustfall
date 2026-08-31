import { Button, Field, Input, Stack, Text } from '@trustfall/design';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api.ts';

export function SetupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/v1/setup:initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          displayName: form.get('displayName'),
          siteName: form.get('siteName'),
          siteDescription: form.get('siteDescription') || undefined,
        }),
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish setup.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap={4}>
      <Text as="h1" tone="display">
        Set up TrustFall
      </Text>
      <Text tone="muted">Create the owner account. Sign-up stays closed after this.</Text>
      <form onSubmit={onSubmit}>
        <Stack gap={3}>
          <Field label="Site name" htmlFor="siteName">
            <Input id="siteName" name="siteName" required defaultValue="TrustFall" />
          </Field>
          <Field label="Site description" htmlFor="siteDescription">
            <Input id="siteDescription" name="siteDescription" />
          </Field>
          <Field label="Your name" htmlFor="displayName">
            <Input id="displayName" name="displayName" required />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <Input id="password" name="password" type="password" minLength={8} required />
          </Field>
          {error ? <Text tone="caption">{error}</Text> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating owner…' : 'Create owner account'}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
