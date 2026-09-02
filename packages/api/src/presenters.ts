import { toRfc3339 } from '@trustfall/db';
import type {
  ComponentGroupRow,
  ComponentRow,
  IncidentUpdateWithComponents,
  IncidentWithRelations,
  InviteLinkRow,
} from '@trustfall/db';
import { inviteLinkState, inviteRegistrationUrl, remainingUses } from '@trustfall/db';

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
