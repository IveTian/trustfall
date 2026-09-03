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

/**
 * A status's glyph: one of the geometric marks a component's status wears,
 * drawn by `StatusIcon` itself, or a Remix icon by name for a phase or an
 * impact, where the mark should say what is happening rather than how bad.
 */
export type StatusIconKind =
  | 'check'
  | 'diamond'
  | 'triangle'
  | 'stop'
  | 'wrench'
  | 'dot'
  | { remix: string };

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

/**
 * The glyph for each incident status: what the responders were doing at that
 * step, drawn from the Remix set. The pill and the timeline wear the same
 * one, so a phase reads alike wherever it is named.
 */
export const incidentStatusGlyph: Record<IncidentStatus, string> = {
  INVESTIGATING: 'search-line',
  IDENTIFIED: 'lightbulb-line',
  MONITORING: 'eye-line',
  RESOLVED: 'check-line',
};

export const incidentStatusPresentation: Record<IncidentStatus, StatusPresentation> = {
  INVESTIGATING: {
    tone: 'partialOutage',
    icon: { remix: incidentStatusGlyph.INVESTIGATING },
    label: 'Investigating',
  },
  IDENTIFIED: {
    tone: 'degraded',
    icon: { remix: incidentStatusGlyph.IDENTIFIED },
    label: 'Identified',
  },
  MONITORING: {
    tone: 'maintenance',
    icon: { remix: incidentStatusGlyph.MONITORING },
    label: 'Monitoring',
  },
  RESOLVED: {
    tone: 'operational',
    icon: { remix: incidentStatusGlyph.RESOLVED },
    label: 'Resolved',
  },
};

/**
 * A maintenance's status wears the maintenance tone until it is over: the
 * wrench for a window under way, a dot for one still ahead. COMPLETED reads as
 * operational, which is what it left the components as; CANCELLED stays
 * neutral rather than alarming.
 */
/** The glyph for each maintenance status, drawn from the Remix set; the pill and the timeline share it. */
export const maintenanceStatusGlyph: Record<MaintenanceStatus, string> = {
  SCHEDULED: 'calendar-event-line',
  IN_PROGRESS: 'tools-line',
  COMPLETED: 'check-line',
  CANCELLED: 'close-line',
};

export const maintenanceStatusPresentation: Record<MaintenanceStatus, StatusPresentation> = {
  SCHEDULED: {
    tone: 'maintenance',
    icon: { remix: maintenanceStatusGlyph.SCHEDULED },
    label: 'Scheduled',
  },
  IN_PROGRESS: {
    tone: 'maintenance',
    icon: { remix: maintenanceStatusGlyph.IN_PROGRESS },
    label: 'In progress',
  },
  COMPLETED: {
    tone: 'operational',
    icon: { remix: maintenanceStatusGlyph.COMPLETED },
    label: 'Completed',
  },
  CANCELLED: {
    tone: 'operational',
    icon: { remix: maintenanceStatusGlyph.CANCELLED },
    label: 'Cancelled',
  },
};

/**
 * How hard an incident hits, as a warning sign that escalates with it: a
 * note in a circle, a warning triangle, a siren.
 */
export const incidentImpactPresentation: Record<IncidentImpact, StatusPresentation> = {
  MINOR: { tone: 'degraded', icon: { remix: 'error-warning-line' }, label: 'Minor' },
  MAJOR: { tone: 'partialOutage', icon: { remix: 'alert-line' }, label: 'Major' },
  CRITICAL: { tone: 'majorOutage', icon: { remix: 'alarm-warning-line' }, label: 'Critical' },
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
