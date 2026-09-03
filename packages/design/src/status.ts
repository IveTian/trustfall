import type {
  ComponentStatus,
  IncidentImpact,
  IncidentStatus,
  MaintenanceStatus,
} from '@trustfall/shared';

export type StatusTone =
  | 'operational'
  | 'degraded'
  | 'partialOutage'
  | 'majorOutage'
  | 'maintenance';

export type StatusIconKind = 'check' | 'diamond' | 'triangle' | 'stop' | 'wrench' | 'dot';

export type StatusPresentation = {
  tone: StatusTone;
  icon: StatusIconKind;
  label: string;
};

export const componentStatusPresentation: Record<ComponentStatus, StatusPresentation> = {
  STATUS_UNSPECIFIED: { tone: 'operational', icon: 'dot', label: 'Unknown' },
  OPERATIONAL: { tone: 'operational', icon: 'check', label: 'Operational' },
  UNDER_MAINTENANCE: { tone: 'maintenance', icon: 'wrench', label: 'Under maintenance' },
  DEGRADED_PERFORMANCE: { tone: 'degraded', icon: 'diamond', label: 'Degraded performance' },
  PARTIAL_OUTAGE: { tone: 'partialOutage', icon: 'triangle', label: 'Partial outage' },
  MAJOR_OUTAGE: { tone: 'majorOutage', icon: 'stop', label: 'Major outage' },
};

export const incidentStatusPresentation: Record<IncidentStatus, StatusPresentation> = {
  INVESTIGATING: { tone: 'partialOutage', icon: 'triangle', label: 'Investigating' },
  IDENTIFIED: { tone: 'degraded', icon: 'diamond', label: 'Identified' },
  MONITORING: { tone: 'maintenance', icon: 'wrench', label: 'Monitoring' },
  RESOLVED: { tone: 'operational', icon: 'check', label: 'Resolved' },
};

/**
 * The timeline's glyph for each incident status: what the responders were
 * doing at that step, drawn from the Remix set. The pill keeps the geometric
 * status icon; the timeline gets a verb.
 */
export const incidentStatusGlyph: Record<IncidentStatus, string> = {
  INVESTIGATING: 'search-line',
  IDENTIFIED: 'lightbulb-line',
  MONITORING: 'eye-line',
  RESOLVED: 'check-line',
};

/**
 * A maintenance's status wears the maintenance tone until it is over: the
 * wrench for a window under way, a dot for one still ahead. COMPLETED reads as
 * operational, which is what it left the components as; CANCELLED stays
 * neutral rather than alarming.
 */
export const maintenanceStatusPresentation: Record<MaintenanceStatus, StatusPresentation> = {
  SCHEDULED: { tone: 'maintenance', icon: 'dot', label: 'Scheduled' },
  IN_PROGRESS: { tone: 'maintenance', icon: 'wrench', label: 'In progress' },
  COMPLETED: { tone: 'operational', icon: 'check', label: 'Completed' },
  CANCELLED: { tone: 'operational', icon: 'dot', label: 'Cancelled' },
};

/** The timeline's verb for each maintenance status, drawn from the Remix set. */
export const maintenanceStatusGlyph: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'calendar-event-line',
  IN_PROGRESS: 'tools-line',
  COMPLETED: 'check-line',
  CANCELLED: 'close-line',
};

export const incidentImpactPresentation: Record<IncidentImpact, StatusPresentation> = {
  MINOR: { tone: 'degraded', icon: 'diamond', label: 'Minor' },
  MAJOR: { tone: 'partialOutage', icon: 'triangle', label: 'Major' },
  CRITICAL: { tone: 'majorOutage', icon: 'stop', label: 'Critical' },
};

export function overallStatusCopy(status: ComponentStatus, siteName: string): string {
  switch (status) {
    case 'OPERATIONAL':
    case 'STATUS_UNSPECIFIED':
      return `All systems operational at ${siteName}`;
    case 'UNDER_MAINTENANCE':
      return `${siteName} is undergoing scheduled maintenance`;
    case 'DEGRADED_PERFORMANCE':
      return `${siteName} is experiencing degraded performance`;
    case 'PARTIAL_OUTAGE':
      return `${siteName} has a partial outage`;
    case 'MAJOR_OUTAGE':
      return `${siteName} has a major outage`;
  }
}
