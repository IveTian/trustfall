export const COMPONENT_STATUSES = [
  'STATUS_UNSPECIFIED',
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'DEGRADED_PERFORMANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
] as const;

export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const INCIDENT_STATUSES = ['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED'] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_IMPACTS = ['MINOR', 'MAJOR', 'CRITICAL'] as const;

export type IncidentImpact = (typeof INCIDENT_IMPACTS)[number];

/**
 * Where a maintenance sits in its life. SCHEDULED is the window ahead (for a
 * recurring maintenance, the next one); IN_PROGRESS is the window under way.
 * COMPLETED and CANCELLED are terminal.
 */
export const MAINTENANCE_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export type MaintenanceFrequency = (typeof MAINTENANCE_FREQUENCIES)[number];

/**
 * How a maintenance repeats. Wall-clock based: "every day at 02:00" keeps
 * meaning 02:00 in the schedule's time zone across a DST change.
 *
 * - `interval` is the step: every 2 weeks, every 3 months.
 * - `byWeekday` (WEEKLY only) picks the days of the week, 0 = Sunday. When
 *   omitted the first window's weekday is used.
 * - `until` is the last instant a window may start, epoch ms; null means the
 *   series has no end.
 */
export type MaintenanceRecurrence = {
  frequency: MaintenanceFrequency;
  interval: number;
  byWeekday?: number[];
  until?: number | null;
};

const COMPONENT_SEVERITY: Record<ComponentStatus, number> = {
  STATUS_UNSPECIFIED: 0,
  OPERATIONAL: 0,
  UNDER_MAINTENANCE: 1,
  DEGRADED_PERFORMANCE: 2,
  PARTIAL_OUTAGE: 3,
  MAJOR_OUTAGE: 4,
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

export function isActiveMaintenanceStatus(status: MaintenanceStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS';
}

export * from './maintenance-schedule.ts';
