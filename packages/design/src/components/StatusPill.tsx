import * as stylex from '@stylexjs/stylex';
import type {
  ComponentStatus,
  IncidentImpact,
  IncidentStatus,
  MaintenanceStatus,
} from '@trustfall/shared';
import {
  componentStatusPresentation,
  incidentImpactPresentation,
  incidentStatusPresentation,
  maintenanceStatusPresentation,
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
  status: ComponentStatus | IncidentStatus | IncidentImpact | MaintenanceStatus;
  kind?: 'component' | 'incident' | 'impact' | 'maintenance';
}) {
  const presentation =
    kind === 'incident'
      ? incidentStatusPresentation[status as IncidentStatus]
      : kind === 'impact'
        ? incidentImpactPresentation[status as IncidentImpact]
        : kind === 'maintenance'
          ? maintenanceStatusPresentation[status as MaintenanceStatus]
          : componentStatusPresentation[status as ComponentStatus];

  return (
    <span {...stylex.props(styles.pill)}>
      <Badge>
        <StatusIcon icon={presentation.icon} tone={presentation.tone} title={presentation.label} />
        {presentation.label}
      </Badge>
    </span>
  );
}
