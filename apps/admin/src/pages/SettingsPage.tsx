import { Button, Field, Input, Stack, Text, Textarea, Toast } from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api.ts';

export function SettingsPage() {
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void api<{ siteName: string; siteDescription: string }>('/api/v1/settings').then((data) => {
      setSiteName(data.siteName);
      setSiteDescription(data.siteDescription);
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api('/api/v1/settings?updateMask=siteName,siteDescription', {
      method: 'PATCH',
      body: JSON.stringify({ siteName, siteDescription }),
    });
    setToast('Saved settings.');
  }

  return (
    <Stack gap={4}>
      <Text as="h1" tone="display">
        Settings
      </Text>
      <form onSubmit={onSubmit}>
        <Stack gap={3}>
          <Field label="Site name" htmlFor="siteName">
            <Input
              id="siteName"
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
            />
          </Field>
          <Field label="Description" htmlFor="siteDescription">
            <Textarea
              id="siteDescription"
              value={siteDescription}
              onChange={(event) => setSiteDescription(event.target.value)}
            />
          </Field>
          <Button type="submit">Save changes</Button>
        </Stack>
      </form>
      <Toast message={toast} />
    </Stack>
  );
}
