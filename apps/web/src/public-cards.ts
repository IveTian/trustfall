import type { IncidentWithRelations, MaintenanceWithRelations } from '@trustfall/db';
import type { PublicIncident, PublicMaintenance } from '@trustfall/design';

/** Where the public site opens an incident. */
export function incidentHref(id: string): string {
  return `/incidents/${id}`;
}

/** Where the public site opens a maintenance. */
export function maintenanceHref(id: string): string {
  return `/maintenance/${id}`;
}

/** A database incident as the public cards take it, linked to its page. */
export function toIncident(incident: IncidentWithRelations): PublicIncident {
  return {
    id: incident.id,
    title: incident.title,
    status: incident.status,
    impact: incident.impact,
    startTime: incident.startTime,
    resolveTime: incident.resolveTime,
    updates: incident.updates,
    href: incidentHref(incident.id),
  };
}

/** A database maintenance as the public cards take it, linked to its page. */
export function toMaintenance(maintenance: MaintenanceWithRelations): PublicMaintenance {
  return {
    id: maintenance.id,
    title: maintenance.title,
    status: maintenance.status,
    windowStart: maintenance.windowStart,
    windowEnd: maintenance.windowEnd,
    startTime: maintenance.startTime,
    recurrence: maintenance.recurrence ?? null,
    timeZone: maintenance.timeZone,
    affectedComponents: maintenance.components,
    updates: maintenance.updates,
    href: maintenanceHref(maintenance.id),
  };
}
