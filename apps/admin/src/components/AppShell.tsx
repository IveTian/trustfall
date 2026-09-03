import { AppShell as Shell } from '@trustfall/design';
import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { isSettingsPath } from '../lib/settings-sections.ts';
import { ConsoleSidebar } from './ConsoleSidebar.tsx';
import { SettingsSidebar } from './SettingsSidebar.tsx';

/**
 * Two rails, one at a time: the console rail, and the settings rail that
 * pushes in over it while the URL is under /settings.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const inSettings = isSettingsPath(location.pathname);

  // Where the settings rail's back button returns to: the last console screen
  // you were on before Settings pushed in, not a fixed home.
  const returnTo = useRef('/');
  useEffect(() => {
    if (!inSettings) {
      returnTo.current = `${location.pathname}${location.search}`;
    }
  }, [inSettings, location.pathname, location.search]);

  return (
    <Shell
      activeSidebar={inSettings ? 'settings' : 'console'}
      sidebars={[
        { key: 'console', depth: 0, node: <ConsoleSidebar /> },
        {
          key: 'settings',
          depth: 1,
          node: <SettingsSidebar onBack={() => navigate(returnTo.current)} />,
        },
      ]}
    >
      {children}
    </Shell>
  );
}
