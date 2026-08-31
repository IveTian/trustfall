import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import type { StatusTone } from '../status.ts';

const styles = stylex.create({
  badge: {
    alignItems: 'center',
    borderRadius: radius.pill,
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightBold,
    gap: space[1],
    lineHeight: text.lineCaption,
    paddingBlock: space[1],
    paddingInline: space[2],
  },
  operational: {
    backgroundColor: color.operationalMuted,
    color: color.operational,
  },
  degraded: {
    backgroundColor: color.degradedMuted,
    color: color.degraded,
  },
  partialOutage: {
    backgroundColor: color.partialOutageMuted,
    color: color.partialOutage,
  },
  majorOutage: {
    backgroundColor: color.majorOutageMuted,
    color: color.majorOutage,
  },
  maintenance: {
    backgroundColor: color.maintenanceMuted,
    color: color.maintenance,
  },
  neutral: {
    backgroundColor: color.accentMuted,
    color: color.textPrimary,
  },
});

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: StatusTone | 'neutral';
}) {
  return <span {...stylex.props(styles.badge, styles[tone])}>{children}</span>;
}
