import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';
import {
  componentStatusPresentation,
  incidentImpactPresentation,
  incidentStatusPresentation,
} from '../status.ts';
import { space } from '../tokens/space.stylex.ts';
import { Badge } from './Badge.tsx';
import { StatusIcon } from './StatusIcon.tsx';

const styles = stylex.create({
  pill: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space[1],
  },
});

export function StatusPill({
  status,
  kind = 'component',
}: {
  status: ComponentStatus | IncidentStatus | IncidentImpact;
  kind?: 'component' | 'incident' | 'impact';
}) {
  const presentation =
    kind === 'incident'
      ? incidentStatusPresentation[status as IncidentStatus]
      : kind === 'impact'
        ? incidentImpactPresentation[status as IncidentImpact]
        : componentStatusPresentation[status as ComponentStatus];

  return (
    <span {...stylex.props(styles.pill)}>
      <Badge tone={presentation.tone}>
        <StatusIcon icon={presentation.icon} tone={presentation.tone} title={presentation.label} />
        {presentation.label}
      </Badge>
    </span>
  );
}
