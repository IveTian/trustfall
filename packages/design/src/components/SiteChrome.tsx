import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Link } from './Link.tsx';
import { MeshScreen } from './MeshScreen.tsx';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  brand: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeTitle,
    fontWeight: text.weightBold,
    textDecoration: 'none',
  },
});

export function SiteChrome({
  siteName,
  children,
  cols = 7,
}: {
  siteName: string;
  children: ReactNode;
  cols?: number;
}) {
  return (
    <MeshScreen cols={cols}>
      <Stack gap={5} grow justify="between">
        <Stack gap={5}>
          <header>
            <Stack direction="horizontal" justify="between" gap={3} wrap>
              <a href="/" {...stylex.props(styles.brand)}>
                {siteName}
              </a>
              <Stack direction="horizontal" gap={3} as="nav" wrap>
                <Link href="/incidents">Incident history</Link>
                <Link href="/admin/">Admin</Link>
              </Stack>
            </Stack>
          </header>
          {children}
        </Stack>
        <footer>
          <Text tone="caption">
            Status is updated by operators. This page does not probe services.
          </Text>
        </footer>
      </Stack>
    </MeshScreen>
  );
}
