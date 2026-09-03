import { toRfc3339 } from '@trustfall/db';
import type {
  ComponentGroupRow,
  ComponentRow,
  IncidentUpdateWithComponents,
  IncidentWithRelations,
  InviteLinkRow,
  MaintenanceUpdateRow,
  MaintenanceWithRelations,
} from '@trustfall/db';
import { inviteLinkState, inviteRegistrationUrl, remainingUses, scheduleOf } from '@trustfall/db';
import { upcomingWindows } from '@trustfall/shared';

export function presentComponent(row: ComponentRow) {
  return {
    id: row.id,
    display_name: row.displayName,
    description: row.description,
    status: row.status,
    group_id: row.groupId,
    position: row.position,
    created_at: toRfc3339(row.createTime)!,
    updated_at: toRfc3339(row.updateTime)!,
  };
}

export function presentGroup(row: ComponentGroupRow) {
  return {
    id: row.id,
    display_name: row.displayName,
    description: row.description,
    position: row.position,
    created_at: toRfc3339(row.createTime)!,
    updated_at: toRfc3339(row.updateTime)!,
  };
}

export function presentUpdate(row: IncidentUpdateWithComponents) {
  return {
    id: row.id,
    incident_id: row.incidentId,
    status: row.status,
    body: row.body,
    created_at: toRfc3339(row.createTime)!,
    affected_components: row.components.map((item) => ({
      component_id: item.componentId,
      display_name: item.displayName,
      status: item.status,
    })),
  };
}

export function presentIncident(row: IncidentWithRelations) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    impact: row.impact,
    started_at: toRfc3339(row.startTime)!,
    resolved_at: toRfc3339(row.resolveTime),
    created_at: toRfc3339(row.createTime)!,
    updated_at: toRfc3339(row.updateTime)!,
    affected_components: row.components.map((item) => ({
      component_id: item.componentId,
      display_name: item.displayName,
      status: item.status,
    })),
    updates: row.updates.map(presentUpdate),
  };
}

export function presentMaintenanceUpdate(row: MaintenanceUpdateRow) {
  return {
    id: row.id,
    maintenance_id: row.maintenanceId,
    status: row.status,
    body: row.body,
    automatic: row.automatic,
    created_at: toRfc3339(row.createTime)!,
  };
}

export function presentMaintenance(row: MaintenanceWithRelations) {
  const recurrence = row.recurrence ?? null;
  const nextWindows =
    recurrence && (row.status === 'SCHEDULED' || row.status === 'IN_PROGRESS')
      ? upcomingWindows(scheduleOf(row), row.windowEnd, { limit: 5, afterStart: row.windowStart })
      : [];
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    starts_at: toRfc3339(row.windowStart)!,
    ends_at: toRfc3339(row.windowEnd)!,
    schedule: {
      starts_at: toRfc3339(row.startTime)!,
      ends_at: toRfc3339(row.endTime)!,
      duration_minutes: Math.round((row.endTime - row.startTime) / 60_000),
      recurrence: recurrence
        ? {
            frequency: recurrence.frequency,
            interval: recurrence.interval,
            ...(recurrence.byWeekday ? { by_weekday: recurrence.byWeekday } : {}),
            until: toRfc3339(recurrence.until),
          }
        : null,
      time_zone: row.timeZone,
    },
    next_windows: nextWindows.map((window) => ({
      starts_at: toRfc3339(window.start)!,
      ends_at: toRfc3339(window.end)!,
    })),
    affected_components: row.components.map((item) => ({
      component_id: item.componentId,
      display_name: item.displayName,
    })),
    updates: row.updates.map(presentMaintenanceUpdate),
    created_at: toRfc3339(row.createTime)!,
    updated_at: toRfc3339(row.updateTime)!,
  };
}

export function presentInviteLink(row: InviteLinkRow, origin: string) {
  return {
    id: row.id,
    token: row.token,
    url: inviteRegistrationUrl(origin, row.token),
    max_uses: row.maxUses,
    use_count: row.useCount,
    remaining_uses: remainingUses(row),
    state: inviteLinkState(row),
    created_by: row.createdBy,
    revoked_at: toRfc3339(row.revokeTime),
    created_at: toRfc3339(row.createTime)!,
    updated_at: toRfc3339(row.updateTime)!,
  };
}

export function presentPublicInvite(row: InviteLinkRow) {
  return {
    state: inviteLinkState(row),
    remaining_uses: remainingUses(row),
  };
}
