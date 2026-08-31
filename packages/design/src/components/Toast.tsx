import * as stylex from '@stylexjs/stylex';
import { zIndex } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Text } from './Text.tsx';

const styles = stylex.create({
  toast: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: shadow.overlay,
    insetInlineEnd: space[4],
    insetBlockEnd: space[4],
    maxWidth: '24rem',
    padding: space[3],
    position: 'fixed',
    zIndex: zIndex.toast,
  },
});

export function Toast({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div {...stylex.props(styles.toast)} role="status">
      <Text tone="body">{message}</Text>
    </div>
  );
}
