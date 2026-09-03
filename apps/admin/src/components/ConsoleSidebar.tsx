import {
  ProfileMenu,
  SidebarClock,
  SidebarNavItem,
  SidebarNavSection,
  Stack,
} from '@trustfall/design';
import { useLocation, useNavigate } from 'react-router';
import { signOut, useSession } from '../lib/auth.ts';
import { SETTINGS_ROOT } from '../lib/settings-sections.ts';

/** The console's own rail: who you are, where you can go, and the way out. */
export function ConsoleSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = useSession();
  const user = data?.user;

  return (
    <Stack gap={5} grow justify="between">
      <Stack gap={4}>
        <ProfileMenu
          name={user?.name || 'Account'}
          email={user?.email}
          image={user?.image}
          items={[
            {
              id: 'settings',
              icon: 'settings',
              label: 'Settings',
              onSelect: () => navigate(SETTINGS_ROOT),
            },
            {
              id: 'sign-out',
              icon: 'sign-out',
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
            icon="layers-fill"
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
          <SidebarNavItem
            icon="hammer-fill"
            label="Maintenance"
            active={location.pathname.startsWith('/maintenance')}
            onClick={() => navigate('/maintenance')}
          />
        </SidebarNavSection>
      </Stack>
      <Stack gap={3}>
        <SidebarNavItem icon="external-link-fill" label="View status page" href="/" />
        <SidebarClock />
      </Stack>
    </Stack>
  );
}
