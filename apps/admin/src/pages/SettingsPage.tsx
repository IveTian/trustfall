import {
  Button,
  Field,
  Input,
  PageBody,
  PageHeader,
  Stack,
  Textarea,
  Toast,
} from '@trustfall/design';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api.ts';

export function SettingsPage() {
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void api<{ site_name: string; site_description: string }>('/api/settings').then((data) => {
      setSiteName(data.site_name);
      setSiteDescription(data.site_description);
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await api('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({ site_name: siteName, site_description: siteDescription }),
    });
    setToast('Saved settings.');
  }

  return (
    <>
      <PageHeader icon="settings-fill" trail={['Status', 'Settings']} />
      <PageBody>
        <Stack gap={4}>
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
              <Stack direction="horizontal" gap={2}>
                <Button type="submit">Save changes</Button>
              </Stack>
            </Stack>
          </form>
          <Toast message={toast} />
        </Stack>
      </PageBody>
    </>
  );
}
