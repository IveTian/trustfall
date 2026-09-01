import {
  AppShell as Shell,
  Button,
  SidebarNavItem,
  SidebarNavSection,
  Stack,
  Text,
  ThemeToggle,
} from '@trustfall/design';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { signOut } from '../lib/auth.ts';

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Shell
      sidebar={
        <Stack gap={5} grow justify="between">
          <Stack gap={4}>
            <Text as="h1" tone="title">
              TrustFall
            </Text>
            <SidebarNavSection>
              <SidebarNavItem
                icon="dashboard-line"
                label="Dashboard"
                active={location.pathname === '/'}
                onClick={() => navigate('/')}
              />
              <SidebarNavItem
                icon="stack-line"
                label="Components"
                active={location.pathname.startsWith('/components')}
                onClick={() => navigate('/components')}
              />
              <SidebarNavItem
                icon="alert-line"
                label="Incidents"
                active={location.pathname.startsWith('/incidents')}
                onClick={() => navigate('/incidents')}
              />
              <SidebarNavItem
                icon="settings-line"
                label="Settings"
                active={location.pathname.startsWith('/settings')}
                onClick={() => navigate('/settings')}
              />
            </SidebarNavSection>
          </Stack>
          <Stack gap={3}>
            <SidebarNavItem icon="external-link-line" label="View status page" href="/" />
            <ThemeToggle />
            <Button type="button" variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </Stack>
        </Stack>
      }
    >
      {children}
    </Shell>
  );
}
