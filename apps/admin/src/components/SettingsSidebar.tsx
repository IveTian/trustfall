import {
  SidebarClock,
  SidebarHeader,
  SidebarNavItem,
  SidebarNavSection,
  Stack,
} from '@trustfall/design';
import { useLocation, useNavigate } from 'react-router';
import { SETTINGS_SECTIONS, settingsPath } from '../lib/settings-sections.ts';

/**
 * The rail that replaces the console rail while you are in Settings: a way
 * back at the top where the profile menu was, then the sections grouped by
 * whose settings they are — yours, or the workspace's.
 */
export function SettingsSidebar({ onBack }: { onBack: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const groups = ['Account', 'Workspace'] as const;

  return (
    <Stack gap={5} grow justify="between">
      <Stack gap={4}>
        <SidebarHeader onBack={onBack} backLabel="Back to console">
          Settings
        </SidebarHeader>
        {groups.map((group) => (
          <SidebarNavSection key={group} label={group}>
            {SETTINGS_SECTIONS.filter((section) => section.group === group).map((section) => {
              const path = settingsPath(section.id);
              return (
                <SidebarNavItem
                  key={section.id}
                  icon={section.icon}
                  label={section.label}
                  active={location.pathname === path}
                  onClick={() => navigate(path)}
                />
              );
            })}
          </SidebarNavSection>
        ))}
      </Stack>
      <SidebarClock />
    </Stack>
  );
}
