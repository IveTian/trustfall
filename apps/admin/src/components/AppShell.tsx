import {
  AppShell as Shell,
  ProfileMenu,
  SidebarNavItem,
  SidebarNavSection,
  Stack,
  Text,
} from '@trustfall/design';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { signOut, useSession } from '../lib/auth.ts';

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useSession();
  const user = data?.user;

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
            </SidebarNavSection>
          </Stack>
          <Stack gap={3}>
            <SidebarNavItem icon="external-link-line" label="View status page" href="/" />
            <ProfileMenu
              name={user?.name || 'Account'}
              email={user?.email}
              image={user?.image}
              items={[
                {
                  id: 'settings',
                  icon: 'settings-line',
                  label: 'Settings',
                  onSelect: () => navigate('/settings'),
                },
                {
                  id: 'sign-out',
                  icon: 'logout-box-r-line',
                  label: 'Sign out',
                  onSelect: () => void signOut(),
                },
              ]}
            />
          </Stack>
        </Stack>
      }
    >
      {children}
    </Shell>
  );
}
