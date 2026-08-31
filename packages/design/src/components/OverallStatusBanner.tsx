import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { componentStatusPresentation, overallStatusCopy } from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { StatusIcon } from './StatusIcon.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  banner: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'grid',
    gap: space[4],
    padding: space[6],
  },
  rule: {
    backgroundColor: color.operational,
    blockSize: space[1],
    borderRadius: radius.pill,
    inlineSize: '100%',
  },
  degraded: { backgroundColor: color.degraded },
  partialOutage: { backgroundColor: color.partialOutage },
  majorOutage: { backgroundColor: color.majorOutage },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space[3],
  },
});

export function OverallStatusBanner({
  status,
  siteName,
  description,
}: {
  status: ComponentStatus;
  siteName: string;
  description?: string;
}) {
  const presentation = componentStatusPresentation[status];
  const ruleStyle =
    presentation.tone === 'degraded'
      ? styles.degraded
      : presentation.tone === 'partialOutage'
        ? styles.partialOutage
        : presentation.tone === 'majorOutage'
          ? styles.majorOutage
          : styles.rule;

  return (
    <section {...stylex.props(styles.banner)} aria-live="polite">
      <div
        {...stylex.props(styles.rule, presentation.tone !== 'operational' && ruleStyle)}
        aria-hidden="true"
      />
      <div {...stylex.props(styles.row)}>
        <StatusIcon icon={presentation.icon} tone={presentation.tone} title={presentation.label} />
        <Text as="h1" tone="display">
          {overallStatusCopy(status, siteName)}
        </Text>
      </div>
      {description ? <Text tone="muted">{description}</Text> : null}
    </section>
  );
}
