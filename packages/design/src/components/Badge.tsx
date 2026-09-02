import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  // One quiet chip for every tone: raised ground, hairline edge, neutral
  // text. The status color lives in the icon alone.
  badge: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    color: color.textPrimary,
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    gap: space[1],
    lineHeight: text.lineCaption,
    paddingBlock: space[1],
    paddingInline: space[2],
  },
});

export function Badge({ children }: { children: ReactNode }) {
  return <span {...stylex.props(styles.badge)}>{children}</span>;
}
