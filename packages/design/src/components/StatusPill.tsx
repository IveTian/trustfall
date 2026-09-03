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

/** Each kind pairs with its own status vocabulary; a mismatch is a type error. */
export type StatusPillProps =
  | { kind?: 'component'; status: ComponentStatus }
  | { kind: 'incident'; status: IncidentStatus }
  | { kind: 'impact'; status: IncidentImpact }
  | { kind: 'maintenance'; status: MaintenanceStatus };

function presentationOf(props: StatusPillProps) {
  switch (props.kind) {
    case 'incident':
      return incidentStatusPresentation[props.status];
    case 'impact':
      return incidentImpactPresentation[props.status];
    case 'maintenance':
      return maintenanceStatusPresentation[props.status];
    default:
      return componentStatusPresentation[props.status];
  }
}

export function StatusPill(props: StatusPillProps) {
  const presentation = presentationOf(props);

  return (
    <span {...stylex.props(styles.pill)}>
      <Badge>
        <StatusIcon icon={presentation.icon} tone={presentation.tone} title={presentation.label} />
        {presentation.label}
      </Badge>
    </span>
  );
}
