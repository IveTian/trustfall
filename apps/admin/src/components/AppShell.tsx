import {
  AppShell as Shell,
  ProfileMenu,
  SidebarNavItem,
  SidebarNavSection,
  Stack,
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
            <SidebarNavSection>
              <SidebarNavItem
                icon="dashboard-fill"
                label="Dashboard"
                active={location.pathname === '/'}
                onClick={() => navigate('/')}
              />
              <SidebarNavItem
                icon="stack-fill"
                label="Components"
                active={location.pathname.startsWith('/components')}
                onClick={() => navigate('/components')}
              />
              <SidebarNavItem
                icon="alert-fill"
                label="Incidents"
                active={location.pathname.startsWith('/incidents')}
                onClick={() => navigate('/incidents')}
              />
            </SidebarNavSection>
          </Stack>
          <Stack gap={3}>
            <SidebarNavItem icon="external-link-fill" label="View status page" href="/" />
          </Stack>
        </Stack>
      }
    >
      {children}
    </Shell>
  );
}
