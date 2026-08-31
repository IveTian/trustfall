import * as stylex from '@stylexjs/stylex';
import { breakpoints, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';

const styles = stylex.create({
  skeleton: {
    animationDuration: {
      default: '1.2s',
      [breakpoints.reduceMotion]: '0ms',
    },
    animationIterationCount: 'infinite',
    animationName: stylex.keyframes({
      '0%': { opacity: 0.55 },
      '50%': { opacity: 1 },
      '100%': { opacity: 0.55 },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.border,
    borderRadius: radius.md,
    height: space[4],
  },
});

export function Skeleton({ label = 'Loading' }: { label?: string }) {
  return <div {...stylex.props(styles.skeleton)} aria-label={label} />;
}
