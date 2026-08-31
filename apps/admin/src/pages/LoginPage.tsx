import { Button, Field, Input, Stack, Text } from '@trustfall/design';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { signIn } from '../lib/auth.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn.email({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (result.error) {
      setError(result.error.message ?? 'Could not sign in.');
      setPending(false);
      return;
    }
    navigate('/');
  }

  return (
    <Stack gap={4}>
      <Text as="h1" tone="display">
        Sign in
      </Text>
      <form onSubmit={onSubmit}>
        <Stack gap={3}>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" required />
          </Field>
          {error ? <Text tone="caption">{error}</Text> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
