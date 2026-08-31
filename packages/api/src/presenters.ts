import { toRfc3339 } from '@trustfall/db';
import type {
  ComponentGroupRow,
  ComponentRow,
  IncidentUpdateRow,
  IncidentWithRelations,
} from '@trustfall/db';
import { resourceName } from './schemas.ts';

export function presentComponent(row: ComponentRow) {
  return {
    name: resourceName('components', row.id),
    displayName: row.displayName,
    description: row.description,
    status: row.status,
    group: row.groupId ? resourceName('componentGroups', row.groupId) : null,
    position: row.position,
    createTime: toRfc3339(row.createTime)!,
    updateTime: toRfc3339(row.updateTime)!,
  };
}

export function presentGroup(row: ComponentGroupRow) {
  return {
    name: resourceName('componentGroups', row.id),
    displayName: row.displayName,
    description: row.description,
    position: row.position,
    createTime: toRfc3339(row.createTime)!,
    updateTime: toRfc3339(row.updateTime)!,
  };
}

export function presentUpdate(row: IncidentUpdateRow, incidentId: string) {
  return {
    name: resourceName(`incidents/${incidentId}/updates`, row.id),
    status: row.status,
    body: row.body,
    createTime: toRfc3339(row.createTime)!,
  };
}

export function presentIncident(row: IncidentWithRelations) {
  return {
    name: resourceName('incidents', row.id),
    title: row.title,
    status: row.status,
    impact: row.impact,
    startTime: toRfc3339(row.startTime)!,
    resolveTime: toRfc3339(row.resolveTime),
    createTime: toRfc3339(row.createTime)!,
    updateTime: toRfc3339(row.updateTime)!,
    components: row.components.map((item) => ({
      component: resourceName('components', item.componentId),
      displayName: item.displayName,
      status: item.status,
    })),
    updates: row.updates.map((update) => presentUpdate(update, row.id)),
  };
}
