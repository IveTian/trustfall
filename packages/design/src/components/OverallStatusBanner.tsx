import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { componentStatusPresentation, overallStatusCopy, type StatusTone } from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { StatusIcon } from './StatusIcon.tsx';
import { Text } from './Text.tsx';

/**
 * The one-glance answer at the top of the public page: the status glyph in a
 * badge of its tone, the sentence, and the site's own line under it. Colour
 * stays on the glyph — and, when things are not operational, on the block
 * around the banner (`SitePanel tone`) — so an all-clear page reads quiet.
 */
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
  return (
    <section {...stylex.props(styles.banner)} aria-live="polite">
      <span {...stylex.props(styles.badge, badgeTone[presentation.tone])}>
        <StatusIcon
          icon={presentation.icon}
          tone={presentation.tone}
          title={presentation.label}
          size="lg"
        />
      </span>
      <div {...stylex.props(styles.copy)}>
        <Text as="h1" tone="display">
          {overallStatusCopy(status, siteName)}
        </Text>
        {description ? <Text tone="muted">{description}</Text> : null}
      </div>
    </section>
  );
}

/** The block's own tone for a status, so the page can tint the surface around the banner. */
export function overallStatusTone(status: ComponentStatus): StatusTone {
  return componentStatusPresentation[status].tone;
}

const styles = stylex.create({
  banner: {
    alignItems: 'center',
    display: 'flex',
    gap: space[4],
  },
  badge: {
    alignItems: 'center',
    backgroundColor: color.surfaceSubtle,
    blockSize: space[7],
    borderRadius: radius.md,
    display: 'flex',
    flexShrink: 0,
    inlineSize: space[7],
    justifyContent: 'center',
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    minWidth: 0,
  },
});

const badgeTone = stylex.create({
  operational: { backgroundColor: color.operationalMuted },
  degraded: { backgroundColor: color.degradedMuted },
  partialOutage: { backgroundColor: color.partialOutageMuted },
  majorOutage: { backgroundColor: color.majorOutageMuted },
  maintenance: { backgroundColor: color.maintenanceMuted },
});
