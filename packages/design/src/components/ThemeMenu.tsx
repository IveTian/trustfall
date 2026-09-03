import { useSyncExternalStore } from 'react';
import { applyTheme, readTheme, subscribeTheme, type ThemePreference } from '../theme-script.ts';
import { Icon } from './Icon.tsx';
import { Menu, type MenuRadius } from './Menu.tsx';

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: string }> = [
  { id: 'system', label: 'System', icon: 'computer-line' },
  { id: 'light', label: 'Light', icon: 'sun-line' },
  { id: 'dark', label: 'Dark', icon: 'moon-line' },
];

function serverTheme(): ThemePreference {
  return 'system';
}

/**
 * The public site's appearance control: one glyph for the current choice, a
 * radio menu of the three. The stored preference is read as an external store
 * so the server and the first client paint agree, then the real value lands.
 */
export function ThemeMenu({ radius }: { radius?: MenuRadius } = {}) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  const current = OPTIONS.find((option) => option.id === theme) ?? OPTIONS[0]!;
  return (
    <Menu
      variant="icon"
      radius={radius}
      label={`Theme: ${current.label}`}
      items={OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
        icon: <Icon name={option.icon} size={16} />,
        selected: option.id === theme,
        onSelect: () => applyTheme(option.id),
      }))}
    >
      <Icon name={current.icon} size={16} />
    </Menu>
  );
}
