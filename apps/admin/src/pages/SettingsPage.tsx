import { PageBody, PageHeader, Toast } from '@trustfall/design';
import { Navigate, useParams } from 'react-router';
import {
  DEFAULT_SETTINGS_SECTION,
  findSettingsSection,
  settingsPath,
  type SettingsSectionId,
} from '../lib/settings-sections.ts';
import { useToast } from '../lib/toast.ts';
import { AppearanceSettings } from './settings/AppearanceSettings.tsx';
import { MembersSettings } from './settings/MembersSettings.tsx';
import { PreferencesSettings } from './settings/PreferencesSettings.tsx';
import { ProfileSettings } from './settings/ProfileSettings.tsx';
import { WorkspaceSettings } from './settings/WorkspaceSettings.tsx';

/**
 * One page per section, picked by the URL so a section can be linked to and
 * so the rail's active pill and the breadcrumb come from the same source.
 * The sections share one toast: a save in any of them reports the same way.
 */
export function SettingsPage() {
  const { section } = useParams();
  const current = findSettingsSection(section);
  const [toast, showToast] = useToast();

  if (!current) {
    return <Navigate to={settingsPath(DEFAULT_SETTINGS_SECTION)} replace />;
  }

  return (
    <>
      <PageHeader icon="settings-fill" trail={['Settings', current.label]} />
      <PageBody>
        <Section id={current.id} onToast={showToast} />
        <Toast message={toast} />
      </PageBody>
    </>
  );
}

function Section({ id, onToast }: { id: SettingsSectionId; onToast: (message: string) => void }) {
  switch (id) {
    case 'profile':
      return <ProfileSettings onToast={onToast} />;
    case 'preferences':
      return <PreferencesSettings />;
    case 'workspace':
      return <WorkspaceSettings onToast={onToast} />;
    case 'appearance':
      return <AppearanceSettings onToast={onToast} />;
    case 'members':
      return <MembersSettings onToast={onToast} />;
  }
}
