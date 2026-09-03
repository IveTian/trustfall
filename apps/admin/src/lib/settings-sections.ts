/**
 * The settings area, as the rail and the page both see it. One list keeps the
 * sidebar, the routes, and the breadcrumb agreeing on names and order.
 */
export type SettingsSectionId = 'profile' | 'preferences' | 'workspace' | 'members';

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  icon: string;
  group: 'Account' | 'Workspace';
};

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: 'profile', label: 'Profile', icon: 'user-fill', group: 'Account' },
  { id: 'preferences', label: 'Preferences', icon: 'equalizer-fill', group: 'Account' },
  { id: 'workspace', label: 'Workspace', icon: 'building-fill', group: 'Workspace' },
  { id: 'members', label: 'Members', icon: 'group-fill', group: 'Workspace' },
];

export const DEFAULT_SETTINGS_SECTION: SettingsSectionId = 'profile';

export const SETTINGS_ROOT = '/settings';

export function settingsPath(id: SettingsSectionId): string {
  return `${SETTINGS_ROOT}/${id}`;
}

export function findSettingsSection(id: string | undefined): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.id === id);
}

export function isSettingsPath(pathname: string): boolean {
  return pathname === SETTINGS_ROOT || pathname.startsWith(`${SETTINGS_ROOT}/`);
}
