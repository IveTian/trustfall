import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { zIndex } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Button } from './Button.tsx';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgb(16 20 26 / 0.52)',
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: space[4],
    position: 'fixed',
    zIndex: zIndex.dialog,
  },
  panel: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.lg,
    boxShadow: shadow.overlay,
    maxWidth: space.prose,
    padding: space[5],
    width: '100%',
  },
});

export function Dialog({
  title,
  children,
  onClose,
  open,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      {...stylex.props(styles.backdrop)}
      role="presentation"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        {...stylex.props(styles.panel)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <Stack gap={4}>
          <Text as="h2" tone="title">
            <span id="dialog-title">{title}</span>
          </Text>
          {children}
          <Button variant="ghost" onClick={onClose} type="button">
            Close
          </Button>
        </Stack>
      </div>
    </div>
  );
}
