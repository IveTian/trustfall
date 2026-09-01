export const COMPONENT_STATUSES = [
  'STATUS_UNSPECIFIED',
  'OPERATIONAL',
  'DEGRADED_PERFORMANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const INCIDENT_STATUSES = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_IMPACTS = ['MINOR', 'MAJOR', 'CRITICAL'] as const;

export type IncidentImpact = (typeof INCIDENT_IMPACTS)[number];

const COMPONENT_SEVERITY: Record<ComponentStatus, number> = {
  STATUS_UNSPECIFIED: 0,
  OPERATIONAL: 0,
  DEGRADED_PERFORMANCE: 1,
  PARTIAL_OUTAGE: 2,
  MAJOR_OUTAGE: 3,
};

export function rollupOverallStatus(statuses: readonly ComponentStatus[]): ComponentStatus {
  if (statuses.length === 0) {
    return 'OPERATIONAL';
  }

  let worst: ComponentStatus = 'OPERATIONAL';
  let worstSeverity = 0;

  for (const status of statuses) {
    const severity = COMPONENT_SEVERITY[status];
    if (severity > worstSeverity) {
      worst = status;
      worstSeverity = severity;
    }
  }

  return worst;
}

export function isActiveIncidentStatus(status: IncidentStatus): boolean {
  return status !== 'RESOLVED';
}
