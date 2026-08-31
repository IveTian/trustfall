import * as stylex from '@stylexjs/stylex';
import { Button, compactSpace, compactText, Link, Stack, Text, ThemeToggle } from '@trustfall/design';
import { color } from '@trustfall/design/tokens/color.stylex.ts';
import { space } from '@trustfall/design/tokens/space.stylex.ts';
import { text } from '@trustfall/design/tokens/text.stylex.ts';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { signOut } from '../lib/auth.ts';

const styles = stylex.create({
  shell: {
    backgroundColor: color.surface,
    color: color.textPrimary,
    display: 'grid',
    fontFamily: text.familyUi,
    gridTemplateColumns: '14rem 1fr',
    minHeight: '100%',
  },
  side: {
    padding: space.page,
  },
  main: {
    padding: space.page,
  },
  navLink: {
    textDecoration: 'none',
  },
});

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div {...stylex.props(compactSpace, compactText, styles.shell)}>
      <aside {...stylex.props(styles.side)}>
        <Stack gap={4}>
          <Text as="h1" tone="title">
            TrustFall
          </Text>
          <Stack gap={2} as="nav">
            <NavLink to="/" {...stylex.props(styles.navLink)}>
              Dashboard
            </NavLink>
            <NavLink to="/components" {...stylex.props(styles.navLink)}>
              Components
            </NavLink>
            <NavLink to="/incidents" {...stylex.props(styles.navLink)}>
              Incidents
            </NavLink>
            <NavLink to="/settings" {...stylex.props(styles.navLink)}>
              Settings
            </NavLink>
            <Link href="/">View status page</Link>
          </Stack>
          <ThemeToggle />
          <Button type="button" variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Stack>
      </aside>
      <main {...stylex.props(styles.main)}>{children}</main>
    </div>
  );
}
