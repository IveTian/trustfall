import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';

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
    case 'DEGRADED_PERFORMANCE':
      return `${siteName} is experiencing degraded performance`;
    case 'PARTIAL_OUTAGE':
      return `${siteName} has a partial outage`;
    case 'MAJOR_OUTAGE':
      return `${siteName} has a major outage`;
  }
}
