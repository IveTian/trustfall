import * as stylex from '@stylexjs/stylex';
import { useEffect, useState } from 'react';
import { applyTheme, readTheme, type ThemePreference } from '../theme-script.ts';
import { space } from '../tokens/space.stylex.ts';
import { Button } from './Button.tsx';
import { Stack } from './Stack.tsx';

const styles = stylex.create({
  group: {
    gap: space[1],
  },
});

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

  return (
    <Stack direction="horizontal" gap={1} as="div">
      <span {...stylex.props(styles.group)}>
        {OPTIONS.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant={theme === option.id ? 'secondary' : 'ghost'}
            aria-pressed={theme === option.id}
            onClick={() => {
              setTheme(option.id);
              applyTheme(option.id);
            }}
          >
            {option.label}
          </Button>
        ))}
      </span>
    </Stack>
  );
}
