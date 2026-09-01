import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  base: {
    fontFamily: text.familyUi,
    margin: 0,
  },
  body: {
    color: color.textPrimary,
    fontSize: text.sizeBody,
    fontWeight: text.weightRegular,
    lineHeight: text.lineBody,
  },
  muted: {
    color: color.textMuted,
    fontSize: text.sizeBody,
    fontWeight: text.weightRegular,
    lineHeight: text.lineBody,
  },
  caption: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    fontWeight: text.weightRegular,
    lineHeight: text.lineCaption,
  },
  title: {
    color: color.textPrimary,
    fontSize: text.sizeTitle,
    fontWeight: text.weightBold,
    lineHeight: text.lineTitle,
  },
  display: {
    color: color.textPrimary,
    fontSize: text.sizeDisplay,
    fontWeight: text.weightBold,
    letterSpacing: text.trackingDisplay,
    lineHeight: text.lineDisplay,
  },
  headline: {
    color: color.textPrimary,
    fontSize: text.sizeHeadline,
    fontWeight: text.weightBold,
    letterSpacing: text.trackingDisplay,
    lineHeight: text.lineHeadline,
  },
  mono: {
    color: color.textMuted,
    fontFamily: text.familyMono,
    fontSize: text.sizeCaption,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: text.lineCaption,
  },
});

type Tone = 'body' | 'muted' | 'caption' | 'title' | 'display' | 'headline' | 'mono';

export function Text({
  children,
  tone = 'body',
  as: Tag = 'p',
}: {
  children: ReactNode;
  tone?: Tone;
  as?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'legend';
}) {
  return <Tag {...stylex.props(styles.base, styles[tone])}>{children}</Tag>;
}
