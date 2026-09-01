import * as stylex from '@stylexjs/stylex';
import { breakpoints, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Text } from './Text.tsx';

const styles = stylex.create({
  toast: {
    animationDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: `translateY(${space[2]})` },
      to: { opacity: 1, transform: 'translateY(0)' },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.overlay,
    // Bottom end, clear of the page header's actions.
    insetBlockEnd: space[5],
    insetInlineEnd: space[5],
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
