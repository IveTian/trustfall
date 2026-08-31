import { and, asc, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { isActiveIncidentStatus, rollupOverallStatus } from '@trustfall/shared';
import { createId, nowMs } from './ids.ts';
import {
  componentGroups,
  components,
  incidentComponents,
  incidents,
  incidentUpdates,
  settings,
} from './schema.ts';
import type { Database } from './client.ts';

export type ComponentGroupRow = typeof componentGroups.$inferSelect;
export type ComponentRow = typeof components.$inferSelect;
export type IncidentRow = typeof incidents.$inferSelect;
export type IncidentUpdateRow = typeof incidentUpdates.$inferSelect;

export async function getSetting(db: Database, key: string): Promise<string | undefined> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function listSettings(db: Database): Promise<Record<string, string>> {
  const rows = await db.select().from(settings).all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function listComponentGroups(db: Database): Promise<ComponentGroupRow[]> {
  return db.select().from(componentGroups).orderBy(asc(componentGroups.position)).all();
}

export async function getComponentGroup(
  db: Database,
  id: string,
): Promise<ComponentGroupRow | undefined> {
  return db.select().from(componentGroups).where(eq(componentGroups.id, id)).get();
}

export async function createComponentGroup(
  db: Database,
  input: { displayName: string; description?: string | null; position?: number },
): Promise<ComponentGroupRow> {
  const now = nowMs();
  const row = {
    id: createId('grp'),
    displayName: input.displayName,
    description: input.description ?? null,
    position: input.position ?? 0,
    createTime: now,
    updateTime: now,
  };
  await db.insert(componentGroups).values(row);
  return row;
}

export async function updateComponentGroup(
  db: Database,
  id: string,
  patch: { displayName?: string; description?: string | null; position?: number },
): Promise<ComponentGroupRow | undefined> {
  const existing = await getComponentGroup(db, id);
  if (!existing) {
    return undefined;
  }
  const next = {
    displayName: patch.displayName ?? existing.displayName,
    description: patch.description === undefined ? existing.description : patch.description,
    position: patch.position ?? existing.position,
    updateTime: nowMs(),
  };
  await db.update(componentGroups).set(next).where(eq(componentGroups.id, id));
  return { ...existing, ...next };
}

export async function deleteComponentGroup(db: Database, id: string): Promise<boolean> {
  const result = await db.delete(componentGroups).where(eq(componentGroups.id, id));
  return (result.meta.changes ?? 0) > 0;
}

export async function listComponents(
  db: Database,
  filter?: { groupId?: string | null },
): Promise<ComponentRow[]> {
  const query = db.select().from(components).orderBy(asc(components.position), asc(components.displayName));
  if (filter?.groupId === null) {
    return query.where(isNull(components.groupId)).all();
  }
  if (filter?.groupId) {
    return query.where(eq(components.groupId, filter.groupId)).all();
  }
  return query.all();
}

export async function getComponent(db: Database, id: string): Promise<ComponentRow | undefined> {
  return db.select().from(components).where(eq(components.id, id)).get();
}

export async function createComponent(
  db: Database,
  input: {
    displayName: string;
    description?: string | null;
    groupId?: string | null;
    status?: ComponentStatus;
    position?: number;
  },
): Promise<ComponentRow> {
  const now = nowMs();
  const row = {
    id: createId('cmp'),
    groupId: input.groupId ?? null,
    displayName: input.displayName,
    description: input.description ?? null,
    status: input.status ?? 'OPERATIONAL',
    position: input.position ?? 0,
    createTime: now,
    updateTime: now,
  };
  await db.insert(components).values(row);
  return row;
}

export async function updateComponent(
  db: Database,
  id: string,
  patch: {
    displayName?: string;
    description?: string | null;
    groupId?: string | null;
    status?: ComponentStatus;
    position?: number;
  },
): Promise<ComponentRow | undefined> {
  const existing = await getComponent(db, id);
  if (!existing) {
    return undefined;
  }
  const next = {
    displayName: patch.displayName ?? existing.displayName,
    description: patch.description === undefined ? existing.description : patch.description,
    groupId: patch.groupId === undefined ? existing.groupId : patch.groupId,
    status: patch.status ?? existing.status,
    position: patch.position ?? existing.position,
    updateTime: nowMs(),
  };
  await db.update(components).set(next).where(eq(components.id, id));
  return { ...existing, ...next };
}

export async function deleteComponent(db: Database, id: string): Promise<boolean> {
  const result = await db.delete(components).where(eq(components.id, id));
  return (result.meta.changes ?? 0) > 0;
}

export async function setComponentStatus(
  db: Database,
  id: string,
  status: ComponentStatus,
): Promise<ComponentRow | undefined> {
  return updateComponent(db, id, { status });
}

export type IncidentWithRelations = IncidentRow & {
  updates: IncidentUpdateRow[];
  components: Array<{ componentId: string; status: ComponentStatus; displayName: string }>;
};

async function attachIncidentRelations(
  db: Database,
  rows: IncidentRow[],
): Promise<IncidentWithRelations[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((row) => row.id);
  const [updateRows, affected] = await Promise.all([
    db
      .select()
      .from(incidentUpdates)
      .where(inArray(incidentUpdates.incidentId, ids))
      .orderBy(desc(incidentUpdates.createTime))
      .all(),
    db
      .select({
        incidentId: incidentComponents.incidentId,
        componentId: incidentComponents.componentId,
        status: incidentComponents.status,
        displayName: components.displayName,
      })
      .from(incidentComponents)
      .innerJoin(components, eq(components.id, incidentComponents.componentId))
      .where(inArray(incidentComponents.incidentId, ids))
      .all(),
  ]);

  return rows.map((row) => ({
    ...row,
    updates: updateRows.filter((update) => update.incidentId === row.id),
    components: affected
      .filter((item) => item.incidentId === row.id)
      .map(({ componentId, status, displayName }) => ({ componentId, status, displayName })),
  }));
}

export async function listIncidents(
  db: Database,
  options?: { pageSize?: number; pageToken?: string; filter?: 'active' | 'resolved' | 'all' },
): Promise<{ incidents: IncidentWithRelations[]; nextPageToken?: string }> {
  const pageSize = Math.min(Math.max(options?.pageSize ?? 25, 1), 100);
  const offset = decodePageToken(options?.pageToken);
  const filter = options?.filter ?? 'all';

  const conditions = [];
  if (filter === 'active') {
    conditions.push(sql`${incidents.status} != 'RESOLVED'`);
  } else if (filter === 'resolved') {
    conditions.push(eq(incidents.status, 'RESOLVED'));
  }

  const rows = await db
    .select()
    .from(incidents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(incidents.startTime))
    .limit(pageSize + 1)
    .offset(offset)
    .all();

  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  const withRelations = await attachIncidentRelations(db, page);

  return {
    incidents: withRelations,
    nextPageToken: hasMore ? encodePageToken(offset + pageSize) : undefined,
  };
}

export async function getIncident(
  db: Database,
  id: string,
): Promise<IncidentWithRelations | undefined> {
  const row = await db.select().from(incidents).where(eq(incidents.id, id)).get();
  if (!row) {
    return undefined;
  }
  const [withRelations] = await attachIncidentRelations(db, [row]);
  return withRelations;
}

export async function createIncident(
  db: Database,
  input: {
    title: string;
    status?: IncidentStatus;
    impact: IncidentImpact;
    body: string;
    componentIds: string[];
    componentStatuses?: Record<string, ComponentStatus>;
  },
): Promise<IncidentWithRelations> {
  const now = nowMs();
  const status = input.status ?? 'INVESTIGATING';
  const incident: IncidentRow = {
    id: createId('inc'),
    title: input.title,
    status,
    impact: input.impact,
    startTime: now,
    resolveTime: null,
    createTime: now,
    updateTime: now,
  };

  await db.batch([
    db.insert(incidents).values(incident),
    db.insert(incidentUpdates).values({
      id: createId('upd'),
      incidentId: incident.id,
      status,
      body: input.body,
      createTime: now,
    }),
    ...(input.componentIds.length
      ? [
          db.insert(incidentComponents).values(
            input.componentIds.map((componentId) => ({
              incidentId: incident.id,
              componentId,
              status: input.componentStatuses?.[componentId] ?? 'PARTIAL_OUTAGE',
            })),
          ),
        ]
      : []),
  ]);

  for (const componentId of input.componentIds) {
    const nextStatus = input.componentStatuses?.[componentId] ?? 'PARTIAL_OUTAGE';
    await db
      .update(components)
      .set({ status: nextStatus, updateTime: now })
      .where(eq(components.id, componentId));
  }

  const created = await getIncident(db, incident.id);
  if (!created) {
    throw new Error('Failed to load created incident.');
  }
  return created;
}

export async function updateIncident(
  db: Database,
  id: string,
  patch: { title?: string; impact?: IncidentImpact },
): Promise<IncidentWithRelations | undefined> {
  const existing = await getIncident(db, id);
  if (!existing) {
    return undefined;
  }
  await db
    .update(incidents)
    .set({
      title: patch.title ?? existing.title,
      impact: patch.impact ?? existing.impact,
      updateTime: nowMs(),
    })
    .where(eq(incidents.id, id));
  return getIncident(db, id);
}

export async function deleteIncident(db: Database, id: string): Promise<boolean> {
  const result = await db.delete(incidents).where(eq(incidents.id, id));
  return (result.meta.changes ?? 0) > 0;
}

export async function addIncidentUpdate(
  db: Database,
  incidentId: string,
  input: { status: IncidentStatus; body: string },
): Promise<IncidentWithRelations | undefined> {
  const existing = await getIncident(db, incidentId);
  if (!existing) {
    return undefined;
  }
  const now = nowMs();
  const resolved = input.status === 'RESOLVED';
  await db.batch([
    db.insert(incidentUpdates).values({
      id: createId('upd'),
      incidentId,
      status: input.status,
      body: input.body,
      createTime: now,
    }),
    db
      .update(incidents)
      .set({
        status: input.status,
        resolveTime: resolved ? now : existing.resolveTime,
        updateTime: now,
      })
      .where(eq(incidents.id, incidentId)),
  ]);

  if (resolved) {
    await restoreIncidentComponents(db, existing);
  }

  return getIncident(db, incidentId);
}

export async function resolveIncident(
  db: Database,
  incidentId: string,
  body?: string,
): Promise<IncidentWithRelations | undefined> {
  return addIncidentUpdate(db, incidentId, {
    status: 'RESOLVED',
    body: body ?? 'This incident has been resolved.',
  });
}

async function restoreIncidentComponents(db: Database, incident: IncidentWithRelations) {
  const now = nowMs();
  for (const affected of incident.components) {
    await db
      .update(components)
      .set({ status: 'OPERATIONAL', updateTime: now })
      .where(eq(components.id, affected.componentId));
  }
}

export async function getSummary(db: Database) {
  const [groups, allComponents, active, siteName, siteDescription] = await Promise.all([
    listComponentGroups(db),
    listComponents(db),
    listIncidents(db, { filter: 'active', pageSize: 50 }),
    getSetting(db, 'siteName'),
    getSetting(db, 'siteDescription'),
  ]);

  const overallStatus = rollupOverallStatus(allComponents.map((row) => row.status));

  return {
    overallStatus,
    siteName: siteName ?? 'TrustFall',
    siteDescription: siteDescription ?? '',
    componentGroups: groups.map((group) => ({
      ...group,
      components: allComponents.filter((component) => component.groupId === group.id),
    })),
    ungroupedComponents: allComponents.filter((component) => component.groupId == null),
    activeIncidents: active.incidents.filter((incident) =>
      isActiveIncidentStatus(incident.status),
    ),
  };
}

export async function countUsers(db: Database): Promise<number> {
  const row = await db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM "user"`);
  return Number(row?.count ?? 0);
}

export async function searchComponents(db: Database, query: string): Promise<ComponentRow[]> {
  return db
    .select()
    .from(components)
    .where(like(components.displayName, `%${query}%`))
    .orderBy(asc(components.displayName))
    .all();
}

export function paginate<T>(
  rows: readonly T[],
  pageSize?: number,
  pageToken?: string,
): { items: T[]; nextPageToken?: string } {
  const size = Math.min(Math.max(pageSize ?? 25, 1), 100);
  const offset = decodePageToken(pageToken);
  const slice = rows.slice(offset, offset + size + 1);
  const hasMore = slice.length > size;
  const items = (hasMore ? slice.slice(0, size) : slice) as T[];
  return {
    items,
    nextPageToken: hasMore ? encodePageToken(offset + size) : undefined,
  };
}

function encodePageToken(offset: number): string {
  return btoa(JSON.stringify({ o: offset }));
}

function decodePageToken(token: string | undefined): number {
  if (!token) {
    return 0;
  }
  try {
    const parsed = JSON.parse(atob(token)) as { o?: number };
    return typeof parsed.o === 'number' && parsed.o >= 0 ? parsed.o : 0;
  } catch {
    return 0;
  }
}
