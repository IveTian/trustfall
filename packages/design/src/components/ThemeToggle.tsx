import { useEffect, useState } from 'react';
import { applyTheme, readTheme, type ThemePreference } from '../theme-script.ts';
import { Button } from './Button.tsx';

const OPTIONS: Array<{ id: ThemePreference; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const current = OPTIONS.find((option) => option.id === theme) ?? {
    id: 'system' as const,
    label: 'System',
  };
  const next =
    OPTIONS[(OPTIONS.findIndex((option) => option.id === theme) + 1) % OPTIONS.length] ?? current;

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={`Theme: ${current.label}. Click to change.`}
      onClick={() => {
        setTheme(next.id);
        applyTheme(next.id);
      }}
    >
      {current.label}
    </Button>
  );
}
