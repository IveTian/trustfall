import {
  applyTheme,
  Field,
  Icon,
  Panel,
  PanelBody,
  PanelHeader,
  readTheme,
  Select,
  Stack,
  type SelectOption,
  type ThemePreference,
} from '@trustfall/design';

const THEME_OPTIONS: Array<SelectOption & { value: ThemePreference }> = [
  { value: 'system', label: 'System', icon: <Icon name="computer" size={16} /> },
  { value: 'light', label: 'Light', icon: <Icon name="sun" size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Icon name="moon" size={16} /> },
];

/**
 * How the console looks to you. These live in this browser, not on the
 * server: they follow the device, not the account.
 */
export function PreferencesSettings() {
  return (
    <Stack gap={5}>
      <Panel>
        <PanelHeader
          title="Appearance"
          caption="Applies right away and is remembered by this browser."
        />
        <PanelBody>
          <Stack gap={3}>
            <Field label="Theme" htmlFor="theme">
              <Select
                id="theme"
                options={THEME_OPTIONS}
                defaultValue={readTheme()}
                onChange={(value) => applyTheme(value as ThemePreference)}
              />
            </Field>
          </Stack>
        </PanelBody>
      </Panel>
    </Stack>
  );
}
