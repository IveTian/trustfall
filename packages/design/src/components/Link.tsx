import * as stylex from '@stylexjs/stylex';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { control } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  link: {
    color: {
      default: color.textMuted,
      ':hover': color.textPrimary,
    },
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    textDecorationLine: 'none',
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': control.focusOffset,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
  },
});

export function Link({
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) {
  return (
    <a {...props} {...stylex.props(styles.link)}>
      {children}
    </a>
  );
}
