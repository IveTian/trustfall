import type { IconName } from '@trustfall/icon';
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
 * A status's glyph, by its name in `@trustfall/icon`: a service's status
 * wears a filled mark whose shape alone tells it apart — circle, diamond,
 * triangle, octagon — so colour is never the only signal; a phase or an
 * impact wears the sign for what is happening.
 */
export type StatusIconKind = IconName;

export type StatusPresentation = {
  tone: StatusTone;
  icon: StatusIconKind;
  label: string;
};

export const componentStatusPresentation: Record<ComponentStatus, StatusPresentation> = {
  STATUS_UNSPECIFIED: { tone: 'operational', icon: 'circle-fill', label: 'Unknown' },
  OPERATIONAL: { tone: 'operational', icon: 'circle-check-fill', label: 'Operational' },
  UNDER_MAINTENANCE: { tone: 'maintenance', icon: 'tools-fill', label: 'Under maintenance' },
  DEGRADED_PERFORMANCE: { tone: 'degraded', icon: 'diamond-fill', label: 'Degraded performance' },
  PARTIAL_OUTAGE: { tone: 'partialOutage', icon: 'triangle-fill', label: 'Partial outage' },
  MAJOR_OUTAGE: { tone: 'majorOutage', icon: 'octagon-fill', label: 'Major outage' },
};

/**
 * The glyph for each incident status: what the responders were doing at that
 * step. The pill and the timeline wear the same
 * one, so a phase reads alike wherever it is named.
 */
export const incidentStatusGlyph: Record<IncidentStatus, IconName> = {
  INVESTIGATING: 'search',
  IDENTIFIED: 'lightbulb',
  MONITORING: 'eye',
  RESOLVED: 'check',
};

export const incidentStatusPresentation: Record<IncidentStatus, StatusPresentation> = {
  INVESTIGATING: {
    tone: 'partialOutage',
    icon: incidentStatusGlyph.INVESTIGATING,
    label: 'Investigating',
  },
  IDENTIFIED: {
    tone: 'degraded',
    icon: incidentStatusGlyph.IDENTIFIED,
    label: 'Identified',
  },
  MONITORING: {
    tone: 'maintenance',
    icon: incidentStatusGlyph.MONITORING,
    label: 'Monitoring',
  },
  RESOLVED: {
    tone: 'operational',
    icon: incidentStatusGlyph.RESOLVED,
    label: 'Resolved',
  },
};

/**
 * A maintenance's status wears the maintenance tone until it is over: the
 * wrench for a window under way, a dot for one still ahead. COMPLETED reads as
 * operational, which is what it left the components as; CANCELLED stays
 * neutral rather than alarming.
 */
/** The glyph for each maintenance status; the pill and the timeline share it. */
export const maintenanceStatusGlyph: Record<MaintenanceStatus, IconName> = {
  SCHEDULED: 'calendar-event',
  IN_PROGRESS: 'tools',
  COMPLETED: 'check',
  CANCELLED: 'close',
};

export const maintenanceStatusPresentation: Record<MaintenanceStatus, StatusPresentation> = {
  SCHEDULED: {
    tone: 'maintenance',
    icon: maintenanceStatusGlyph.SCHEDULED,
    label: 'Scheduled',
  },
  IN_PROGRESS: {
    tone: 'maintenance',
    icon: maintenanceStatusGlyph.IN_PROGRESS,
    label: 'In progress',
  },
  COMPLETED: {
    tone: 'operational',
    icon: maintenanceStatusGlyph.COMPLETED,
    label: 'Completed',
  },
  CANCELLED: {
    tone: 'operational',
    icon: maintenanceStatusGlyph.CANCELLED,
    label: 'Cancelled',
  },
};

/**
 * How hard an incident hits, as a warning sign that escalates with it: a
 * note in a circle, a warning triangle, a siren — solid, like the marks a
 * service's status wears.
 */
export const incidentImpactPresentation: Record<IncidentImpact, StatusPresentation> = {
  MINOR: { tone: 'degraded', icon: 'error-warning-fill', label: 'Minor' },
  MAJOR: { tone: 'partialOutage', icon: 'alert-fill', label: 'Major' },
  CRITICAL: { tone: 'majorOutage', icon: 'siren-fill', label: 'Critical' },
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
