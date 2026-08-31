import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Link } from './Link.tsx';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  canvas: {
    backgroundColor: color.surface,
    color: color.textPrimary,
    fontFamily: text.familyUi,
    minHeight: '100dvh',
  },
  page: {
    marginInline: 'auto',
    maxWidth: space.prose,
    paddingBlock: space[5],
    paddingInline: space.page,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    marginBlockEnd: space[5],
  },
  brand: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeTitle,
    fontWeight: text.weightBold,
    textDecoration: 'none',
  },
  footer: {
    marginBlockStart: space[7],
  },
});

export function SiteChrome({
  siteName,
  children,
}: {
  siteName: string;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.canvas)}>
      <div {...stylex.props(styles.page)}>
        <header {...stylex.props(styles.header)}>
          <a href="/" {...stylex.props(styles.brand)}>
            {siteName}
          </a>
          <Stack direction="horizontal" gap={3} as="nav">
            <Link href="/incidents">Incident history</Link>
            <Link href="/admin/">Admin</Link>
          </Stack>
        </header>
        {children}
        <footer {...stylex.props(styles.footer)}>
          <Text tone="caption">
            Status is updated by operators. This page does not probe services.
          </Text>
        </footer>
      </div>
    </div>
  );
}
