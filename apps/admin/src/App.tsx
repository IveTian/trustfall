import { MeshScreen } from '@trustfall/design';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { AppShell } from './components/AppShell.tsx';
import { useSession } from './lib/auth.ts';
import { DEFAULT_SETTINGS_SECTION, settingsPath } from './lib/settings-sections.ts';
import { SetupProvider, useSetup } from './lib/setup.tsx';
import { ComponentsPage } from './pages/ComponentsPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { IncidentDetailPage } from './pages/IncidentDetailPage.tsx';
import { IncidentsPage } from './pages/IncidentsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { SetupPage } from './pages/SetupPage.tsx';

function Gate() {
  const { data, isPending } = useSession();
  const location = useLocation();
  const { initialized } = useSetup();

  if (isPending || initialized == null) {
    return <MeshScreen />;
  }

  // A live session proves the owner account exists, so it outranks the setup
  // answer: a stale `initialized: false` must never bounce a signed-in user
  // back to the setup form.
  if (data) {
    if (
      location.pathname === '/login' ||
      location.pathname === '/setup' ||
      location.pathname === '/register'
    ) {
      return <Navigate to="/" replace />;
    }
  } else if (!initialized) {
    if (location.pathname !== '/setup') {
      return <Navigate to="/setup" replace />;
    }
  } else if (location.pathname === '/register') {
    // Invite-only registration: the page itself checks the token.
  } else if (location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (
    location.pathname === '/login' ||
    location.pathname === '/setup' ||
    location.pathname === '/register'
  ) {
    return (
      <MeshScreen>
        <Outlet />
      </MeshScreen>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <Gate />,
      children: [
        { path: '/', element: <DashboardPage /> },
        { path: '/login', element: <LoginPage /> },
        { path: '/register', element: <RegisterPage /> },
        { path: '/setup', element: <SetupPage /> },
        { path: '/components', element: <ComponentsPage /> },
        { path: '/incidents', element: <IncidentsPage /> },
        { path: '/incidents/:incidentId', element: <IncidentDetailPage /> },
        {
          path: '/settings',
          element: <Navigate to={settingsPath(DEFAULT_SETTINGS_SECTION)} replace />,
        },
        { path: '/settings/:section', element: <SettingsPage /> },
      ],
    },
  ],
  { basename: '/admin' },
);

export function App() {
  return (
    <SetupProvider>
      <RouterProvider router={router} />
    </SetupProvider>
  );
}
