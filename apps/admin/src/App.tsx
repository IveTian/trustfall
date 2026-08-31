import * as stylex from '@stylexjs/stylex';
import { compactSpace, compactText } from '@trustfall/design';
import { color } from '@trustfall/design/tokens/color.stylex.ts';
import { space } from '@trustfall/design/tokens/space.stylex.ts';
import { text } from '@trustfall/design/tokens/text.stylex.ts';
import { useEffect, useState } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { AppShell } from './components/AppShell.tsx';
import { api } from './lib/api.ts';
import { useSession } from './lib/auth.ts';
import { ComponentsPage } from './pages/ComponentsPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { IncidentDetailPage } from './pages/IncidentDetailPage.tsx';
import { IncidentsPage } from './pages/IncidentsPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { SetupPage } from './pages/SetupPage.tsx';

const styles = stylex.create({
  gate: {
    backgroundColor: color.surface,
    color: color.textPrimary,
    fontFamily: text.familyUi,
    marginInline: 'auto',
    maxWidth: space.prose,
    minHeight: '100%',
    padding: space.page,
  },
});

function Gate() {
  const { data, isPending } = useSession();
  const location = useLocation();
  const [initialized, setInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    void api<{ initialized: boolean }>('/api/v1/setup')
      .then((result) => setInitialized(result.initialized))
      .catch(() => setInitialized(false));
  }, []);

  if (isPending || initialized == null) {
    return <p>Loading…</p>;
  }

  if (!initialized && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }
  if (initialized && location.pathname === '/setup') {
    return <Navigate to="/login" replace />;
  }
  if (!data && location.pathname !== '/login' && location.pathname !== '/setup') {
    return <Navigate to="/login" replace />;
  }
  if (data && (location.pathname === '/login' || location.pathname === '/setup')) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === '/login' || location.pathname === '/setup') {
    return (
      <div {...stylex.props(compactSpace, compactText, styles.gate)}>
        <Outlet />
      </div>
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
        { path: '/setup', element: <SetupPage /> },
        { path: '/components', element: <ComponentsPage /> },
        { path: '/incidents', element: <IncidentsPage /> },
        { path: '/incidents/:incidentId', element: <IncidentDetailPage /> },
        { path: '/settings', element: <SettingsPage /> },
      ],
    },
  ],
  { basename: '/admin' },
);

export function App() {
  return <RouterProvider router={router} />;
}
