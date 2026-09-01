import { Button, Field, Icon, Input, Stack, Text } from '@trustfall/design';
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
    <Stack gap={5} grow justify="between">
      <Text as="h1" tone="title">
        Sign in
      </Text>
      <form onSubmit={onSubmit}>
        <Stack gap={4}>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          {error ? <Text tone="caption">{error}</Text> : null}
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={pending}
            loadingLabel="Signing in"
            endEnhancer={<Icon name="arrow-right-fill" />}
          >
            Sign in
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
