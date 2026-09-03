import { and, asc, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';
import { isActiveIncidentStatus, rollupOverallStatus } from '@trustfall/shared';
import { createId, nowMs } from './ids.ts';
import {
  clampPageSize,
  decodeKeyset,
  decodeOffset,
  encodeKeyset,
  encodeOffset,
  takePage,
} from './pagination.ts';
import {
  componentGroups,
  components,
  incidentComponents,
  incidents,
  incidentUpdateComponents,
  incidentUpdates,
  settings,
} from './schema.ts';
import type { Database } from './client.ts';
import { listActiveMaintenances, restoreComponentsFromIncident } from './maintenances.ts';

export type ComponentGroupRow = typeof componentGroups.$inferSelect;
export type ComponentRow = typeof components.$inferSelect;
export type IncidentRow = typeof incidents.$inferSelect;
export type IncidentUpdateRow = typeof incidentUpdates.$inferSelect;

export type AffectedComponent = {
  componentId: string;
  status: ComponentStatus;
  displayName: string;
};

/** A timeline entry with the affected set as the entry left it. */
export type IncidentUpdateWithComponents = IncidentUpdateRow & {
  components: AffectedComponent[];
};

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
  const query = db
    .select()
    .from(components)
    .orderBy(asc(components.position), asc(components.displayName));
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
  updates: IncidentUpdateWithComponents[];
  components: AffectedComponent[];
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

  const snapshots =
    updateRows.length === 0
      ? []
      : await db
          .select({
            updateId: incidentUpdateComponents.updateId,
            componentId: incidentUpdateComponents.componentId,
            status: incidentUpdateComponents.status,
            displayName: components.displayName,
          })
          .from(incidentUpdateComponents)
          .innerJoin(components, eq(components.id, incidentUpdateComponents.componentId))
          .where(
            inArray(
              incidentUpdateComponents.updateId,
              updateRows.map((update) => update.id),
            ),
          )
          .all();

  return rows.map((row) => ({
    ...row,
    updates: updateRows
      .filter((update) => update.incidentId === row.id)
      .map((update) => ({
        ...update,
        components: snapshots
          .filter((item) => item.updateId === update.id)
          .map(({ componentId, status, displayName }) => ({ componentId, status, displayName })),
      })),
    components: affected
      .filter((item) => item.incidentId === row.id)
      .map(({ componentId, status, displayName }) => ({ componentId, status, displayName })),
  }));
}

/**
 * Freezes the incident's affected set onto one timeline entry. A resolving
 * entry records the components at operational, which is where resolving put
 * them.
 */
async function snapshotUpdateComponents(
  db: Database,
  incidentId: string,
  updateId: string,
  resolved: boolean,
) {
  const affected = await db
    .select({ componentId: incidentComponents.componentId, status: incidentComponents.status })
    .from(incidentComponents)
    .where(eq(incidentComponents.incidentId, incidentId))
    .all();
  if (affected.length === 0) {
    return;
  }
  await db.insert(incidentUpdateComponents).values(
    affected.map((item) => ({
      updateId,
      componentId: item.componentId,
      status: resolved ? ('OPERATIONAL' as const) : item.status,
    })),
  );
}

export type IncidentState = 'ACTIVE' | 'RESOLVED';

/**
 * Keyset paging, not offset paging: incidents are append-heavy, and an incident
 * opened between two page fetches would shift every later row and make the
 * reader skip one. The cursor is `(startTime, id)` of the last row on the page,
 * which is also why the order carries the id as a tie breaker — two incidents
 * opened in the same millisecond must still have one deterministic order.
 *
 * `state` omitted means every incident, newest first.
 */
export async function listIncidents(
  db: Database,
  options?: { pageSize?: number; cursor?: string; state?: IncidentState },
): Promise<{ incidents: IncidentWithRelations[]; nextCursor?: string }> {
  const pageSize = clampPageSize(options?.pageSize);
  const after = decodeKeyset(options?.cursor);

  const conditions = [];
  if (options?.state === 'ACTIVE') {
    conditions.push(sql`${incidents.status} != 'RESOLVED'`);
  } else if (options?.state === 'RESOLVED') {
    conditions.push(eq(incidents.status, 'RESOLVED'));
  }
  if (after) {
    const [startTime, id] = after;
    conditions.push(
      sql`(${incidents.startTime} < ${startTime} or (${incidents.startTime} = ${startTime} and ${incidents.id} < ${id}))`,
    );
  }

  const rows = await db
    .select()
    .from(incidents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(incidents.startTime), desc(incidents.id))
    .limit(pageSize + 1)
    .all();

  const page = takePage(rows, pageSize, (last) => encodeKeyset(last.startTime, last.id));

  return {
    incidents: await attachIncidentRelations(db, page.items),
    nextCursor: page.nextCursor,
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

  const firstUpdateId = createId('upd');
  await db.batch([
    db.insert(incidents).values(incident),
    db.insert(incidentUpdates).values({
      id: firstUpdateId,
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
  await snapshotUpdateComponents(db, incident.id, firstUpdateId, status === 'RESOLVED');

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

/**
 * Removes a mistaken incident. CASCADE clears the timeline and affected-set
 * rows. If the incident is still active, the live component statuses it wrote
 * are restored to operational so the status page does not keep an unexplained
 * outage. Resolved incidents already restored those statuses and may have
 * left join rows in place; rewriting them would clobber a later dashboard
 * edit or overlapping incident.
 */
export async function deleteIncident(db: Database, id: string): Promise<boolean> {
  const existing = await getIncident(db, id);
  if (!existing) {
    return false;
  }
  if (isActiveIncidentStatus(existing.status)) {
    await restoreIncidentComponents(db, existing);
  }
  const result = await db.delete(incidents).where(eq(incidents.id, id));
  return (result.meta.changes ?? 0) > 0;
}

/**
 * Posting an update is how an incident changes state: the timeline entry and
 * the incident's own status move together, and RESOLVED also stamps
 * `resolveTime` and puts the affected components back to operational.
 *
 * Returns the created update alongside the incident so the caller can address
 * it without guessing which timeline entry is the new one.
 */
export async function addIncidentUpdate(
  db: Database,
  incidentId: string,
  input: {
    status: IncidentStatus;
    body: string;
    /**
     * Per-component corrections riding along with the update. OPERATIONAL
     * detaches the component from the incident and restores it; anything else
     * attaches (or re-declares) it and moves the component with it. Components
     * not mentioned are left alone.
     */
    componentStatuses?: Record<string, ComponentStatus>;
  },
): Promise<{ incident: IncidentWithRelations; update: IncidentUpdateWithComponents } | undefined> {
  const existing = await getIncident(db, incidentId);
  if (!existing) {
    return undefined;
  }
  const now = nowMs();
  const resolved = input.status === 'RESOLVED';
  const update: IncidentUpdateRow = {
    id: createId('upd'),
    incidentId,
    status: input.status,
    body: input.body,
    createTime: now,
  };
  await db.batch([
    db.insert(incidentUpdates).values(update),
    db
      .update(incidents)
      .set({
        status: input.status,
        resolveTime: resolved ? now : existing.resolveTime,
        updateTime: now,
      })
      .where(eq(incidents.id, incidentId)),
  ]);

  if (input.componentStatuses) {
    for (const [componentId, status] of Object.entries(input.componentStatuses)) {
      await db
        .delete(incidentComponents)
        .where(
          and(
            eq(incidentComponents.incidentId, incidentId),
            eq(incidentComponents.componentId, componentId),
          ),
        );
      if (status !== 'OPERATIONAL') {
        await db.insert(incidentComponents).values({ incidentId, componentId, status });
      }
      await db
        .update(components)
        .set({ status, updateTime: now })
        .where(eq(components.id, componentId));
    }
  }

  if (resolved) {
    const current =
      (input.componentStatuses ? await getIncident(db, incidentId) : existing) ?? existing;
    await restoreIncidentComponents(db, current);
  }
  await snapshotUpdateComponents(db, incidentId, update.id, resolved);

  const incident = await getIncident(db, incidentId);
  const created = incident?.updates.find((row) => row.id === update.id);
  return incident && created ? { incident, update: created } : undefined;
}

export async function resolveIncident(
  db: Database,
  incidentId: string,
  body?: string,
): Promise<IncidentWithRelations | undefined> {
  const result = await addIncidentUpdate(db, incidentId, {
    status: 'RESOLVED',
    body: body ?? 'This incident has been resolved.',
  });
  return result?.incident;
}

async function restoreIncidentComponents(db: Database, incident: IncidentWithRelations) {
  await restoreComponentsFromIncident(
    db,
    incident.components.map((affected) => affected.componentId),
    nowMs(),
  );
}

export async function getSummary(db: Database) {
  // Maintenance goes first: reconciling it may move component statuses the
  // rest of the snapshot then reads.
  const activeMaintenances = await listActiveMaintenances(db);
  const [groups, allComponents, active, siteName, siteDescription] = await Promise.all([
    listComponentGroups(db),
    listComponents(db),
    listIncidents(db, { state: 'ACTIVE', pageSize: 50 }),
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
    activeIncidents: active.incidents.filter((incident) => isActiveIncidentStatus(incident.status)),
    activeMaintenances,
  };
}

export async function countUsers(db: Database): Promise<number> {
  const row = await db.get<{ count: number }>(sql`SELECT COUNT(*) as count FROM "user"`);
  return Number(row?.count ?? 0);
}

/** Better Auth stores emails lowercased; match that so a retry finds the row. */
export async function hasUserWithEmail(db: Database, email: string): Promise<boolean> {
  const row = await db.get<{ id: string }>(
    sql`SELECT id FROM "user" WHERE lower(email) = ${email.trim().toLowerCase()} LIMIT 1`,
  );
  return row != null;
}

/**
 * A site counts as initialized once the owner account exists. Before that the
 * auth tables may not exist yet, so a failed query means "not initialized".
 */
export async function isSiteInitialized(db: Database): Promise<boolean> {
  try {
    return (await countUsers(db)) > 0;
  } catch {
    return false;
  }
}

export async function searchComponents(db: Database, query: string): Promise<ComponentRow[]> {
  return db
    .select()
    .from(components)
    .where(like(components.displayName, `%${query}%`))
    .orderBy(asc(components.displayName))
    .all();
}

/**
 * Offset paging over an already-loaded list. Only for the small, rarely-written
 * collections (component groups, components, one incident's updates) where the
 * shifting-row problem that keyset paging solves does not arise.
 */
export function paginate<T>(
  rows: readonly T[],
  pageSize?: number,
  cursor?: string,
): { items: T[]; nextCursor?: string } {
  const size = clampPageSize(pageSize);
  const offset = decodeOffset(cursor);
  const slice = rows.slice(offset, offset + size + 1);
  return takePage(slice, size, () => encodeOffset(offset + size));
}
