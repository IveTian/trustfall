import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type {
  MaintenanceRecurrence,
  MaintenanceSchedule,
  MaintenanceStatus,
} from '@trustfall/shared';
import { isActiveMaintenanceStatus, nextWindow } from '@trustfall/shared';
import { createId, nowMs } from './ids.ts';
import { clampPageSize, decodeKeyset, encodeKeyset, takePage } from './pagination.ts';
import { components, maintenanceComponents, maintenances, maintenanceUpdates } from './schema.ts';
import type { Database } from './client.ts';

export type MaintenanceRow = typeof maintenances.$inferSelect;
export type MaintenanceUpdateRow = typeof maintenanceUpdates.$inferSelect;

export type MaintenanceComponent = { componentId: string; displayName: string };

export type MaintenanceWithRelations = MaintenanceRow & {
  /** Newest first. */
  updates: MaintenanceUpdateRow[];
  components: MaintenanceComponent[];
};

export type MaintenanceState = 'ACTIVE' | 'PAST';

/**
 * A transition the maintenance's current state does not allow: completing one
 * that never started, rescheduling one under way. The API reports it as a
 * failed precondition rather than a server fault.
 */
export class MaintenanceStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MaintenanceStateError';
  }
}

const ACTIVE_STATUSES: MaintenanceStatus[] = ['SCHEDULED', 'IN_PROGRESS'];
const PAST_STATUSES: MaintenanceStatus[] = ['COMPLETED', 'CANCELLED'];

export const MAINTENANCE_COPY = {
  started: 'Maintenance has started.',
  completed: 'Maintenance is complete.',
  cancelled: 'This maintenance has been cancelled.',
  elapsed: 'This window elapsed before it could be started.',
} as const;

export function scheduleOf(
  row: Pick<MaintenanceRow, 'startTime' | 'endTime' | 'recurrence' | 'timeZone'>,
): MaintenanceSchedule {
  return {
    startTime: row.startTime,
    endTime: row.endTime,
    recurrence: row.recurrence ?? null,
    timeZone: row.timeZone,
  };
}

async function attachMaintenanceRelations(
  db: Database,
  rows: MaintenanceRow[],
): Promise<MaintenanceWithRelations[]> {
  if (rows.length === 0) {
    return [];
  }
  const ids = rows.map((row) => row.id);
  const [updateRows, affected] = await Promise.all([
    db
      .select()
      .from(maintenanceUpdates)
      .where(inArray(maintenanceUpdates.maintenanceId, ids))
      .orderBy(desc(maintenanceUpdates.createTime), desc(maintenanceUpdates.id))
      .all(),
    db
      .select({
        maintenanceId: maintenanceComponents.maintenanceId,
        componentId: maintenanceComponents.componentId,
        displayName: components.displayName,
        position: components.position,
      })
      .from(maintenanceComponents)
      .innerJoin(components, eq(components.id, maintenanceComponents.componentId))
      .where(inArray(maintenanceComponents.maintenanceId, ids))
      .orderBy(asc(components.position), asc(components.displayName))
      .all(),
  ]);
  return rows.map((row) => ({
    ...row,
    updates: updateRows.filter((update) => update.maintenanceId === row.id),
    components: affected
      .filter((item) => item.maintenanceId === row.id)
      .map(({ componentId, displayName }) => ({ componentId, displayName })),
  }));
}

/**
 * Keyset-paged on `(windowStart, id)`, newest window first, for the same
 * reason incidents are: rows open and close while a reader pages. `state`
 * omitted means every maintenance.
 */
export async function listMaintenances(
  db: Database,
  options?: { pageSize?: number; cursor?: string; state?: MaintenanceState },
): Promise<{ maintenances: MaintenanceWithRelations[]; nextCursor?: string }> {
  await reconcileMaintenances(db);
  const pageSize = clampPageSize(options?.pageSize);
  const after = decodeKeyset(options?.cursor);

  const conditions = [];
  if (options?.state === 'ACTIVE') {
    conditions.push(inArray(maintenances.status, ACTIVE_STATUSES));
  } else if (options?.state === 'PAST') {
    conditions.push(inArray(maintenances.status, PAST_STATUSES));
  }
  if (after) {
    const [windowStart, id] = after;
    conditions.push(
      sql`(${maintenances.windowStart} < ${windowStart} or (${maintenances.windowStart} = ${windowStart} and ${maintenances.id} < ${id}))`,
    );
  }

  const rows = await db
    .select()
    .from(maintenances)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(maintenances.windowStart), desc(maintenances.id))
    .limit(pageSize + 1)
    .all();

  const page = takePage(rows, pageSize, (last) => encodeKeyset(last.windowStart, last.id));
  return {
    maintenances: await attachMaintenanceRelations(db, page.items),
    nextCursor: page.nextCursor,
  };
}

/** What the public page shows: windows under way, then the next to open. */
export async function listActiveMaintenances(
  db: Database,
  limit = 20,
): Promise<MaintenanceWithRelations[]> {
  await reconcileMaintenances(db);
  const rows = await db
    .select()
    .from(maintenances)
    .where(inArray(maintenances.status, ACTIVE_STATUSES))
    .orderBy(asc(maintenances.windowStart), asc(maintenances.id))
    .limit(limit)
    .all();
  return attachMaintenanceRelations(db, rows);
}

async function readMaintenance(
  db: Database,
  id: string,
): Promise<MaintenanceWithRelations | undefined> {
  const row = await db.select().from(maintenances).where(eq(maintenances.id, id)).get();
  if (!row) {
    return undefined;
  }
  const [withRelations] = await attachMaintenanceRelations(db, [row]);
  return withRelations;
}

export async function getMaintenance(
  db: Database,
  id: string,
): Promise<MaintenanceWithRelations | undefined> {
  await reconcileMaintenances(db);
  return readMaintenance(db, id);
}

async function loadOrThrow(db: Database, id: string): Promise<MaintenanceWithRelations> {
  const row = await readMaintenance(db, id);
  if (!row) {
    throw new Error('Failed to load maintenance.');
  }
  return row;
}

/**
 * Puts components under maintenance. A component already degraded by an
 * incident keeps that status: maintenance never hides an outage.
 */
async function coverComponents(db: Database, componentIds: string[], at: number) {
  if (componentIds.length === 0) {
    return;
  }
  await db
    .update(components)
    .set({ status: 'UNDER_MAINTENANCE', updateTime: at })
    .where(
      and(
        inArray(components.id, componentIds),
        inArray(components.status, ['OPERATIONAL', 'STATUS_UNSPECIFIED']),
      ),
    );
}

/**
 * Returns components to operational once no maintenance covers them. Only a
 * component still wearing UNDER_MAINTENANCE moves: one an incident has since
 * declared degraded belongs to that incident now.
 */
async function releaseComponents(
  db: Database,
  maintenanceId: string,
  componentIds: string[],
  at: number,
) {
  if (componentIds.length === 0) {
    return;
  }
  const stillCovered = await db
    .select({ componentId: maintenanceComponents.componentId })
    .from(maintenanceComponents)
    .innerJoin(maintenances, eq(maintenances.id, maintenanceComponents.maintenanceId))
    .where(
      and(
        inArray(maintenanceComponents.componentId, componentIds),
        eq(maintenances.status, 'IN_PROGRESS'),
        ne(maintenances.id, maintenanceId),
      ),
    )
    .all();
  const covered = new Set(stillCovered.map((row) => row.componentId));
  const release = componentIds.filter((id) => !covered.has(id));
  if (release.length === 0) {
    return;
  }
  await db
    .update(components)
    .set({ status: 'OPERATIONAL', updateTime: at })
    .where(and(inArray(components.id, release), eq(components.status, 'UNDER_MAINTENANCE')));
}

/**
 * After an incident lets go of components, a live window takes them back;
 * anything else returns to operational.
 */
export async function restoreComponentsFromIncident(
  db: Database,
  componentIds: string[],
  at: number,
): Promise<void> {
  if (componentIds.length === 0) {
    return;
  }
  const stillCovered = await db
    .select({ componentId: maintenanceComponents.componentId })
    .from(maintenanceComponents)
    .innerJoin(maintenances, eq(maintenances.id, maintenanceComponents.maintenanceId))
    .where(
      and(
        inArray(maintenanceComponents.componentId, componentIds),
        eq(maintenances.status, 'IN_PROGRESS'),
      ),
    )
    .all();
  const covered = new Set(stillCovered.map((row) => row.componentId));
  const maintain = componentIds.filter((id) => covered.has(id));
  const release = componentIds.filter((id) => !covered.has(id));
  if (maintain.length) {
    await db
      .update(components)
      .set({ status: 'UNDER_MAINTENANCE', updateTime: at })
      .where(inArray(components.id, maintain));
  }
  if (release.length) {
    await db
      .update(components)
      .set({ status: 'OPERATIONAL', updateTime: at })
      .where(inArray(components.id, release));
  }
}

async function insertUpdate(
  db: Database,
  maintenanceId: string,
  status: MaintenanceStatus,
  body: string,
  automatic: boolean,
  at: number,
): Promise<MaintenanceUpdateRow> {
  const row: MaintenanceUpdateRow = {
    id: createId('mup'),
    maintenanceId,
    status,
    body,
    automatic,
    createTime: at,
  };
  await db.insert(maintenanceUpdates).values(row);
  return row;
}

/**
 * Writes a window transition only if this occurrence is still in the status
 * we observed. Overlapping reconciles otherwise each insert a timeline row.
 */
async function claimWindow(
  db: Database,
  row: MaintenanceWithRelations,
  values: Partial<MaintenanceRow>,
): Promise<boolean> {
  const result = await db
    .update(maintenances)
    .set(values)
    .where(
      and(
        eq(maintenances.id, row.id),
        eq(maintenances.status, row.status),
        eq(maintenances.windowStart, row.windowStart),
      ),
    );
  return (result.meta.changes ?? 0) > 0;
}

async function latestUpdate(db: Database, id: string): Promise<MaintenanceUpdateRow> {
  const current = await readMaintenance(db, id);
  const update = current?.updates[0];
  if (!update) {
    throw new Error('Failed to load maintenance.');
  }
  return update;
}

/**
 * Opens the tracked window. Started by hand ahead of time, the window keeps
 * its planned start — that is what identifies the occurrence, so closing it
 * moves a series past it rather than back onto it — and the timeline entry
 * records when it really began. If even the planned end has passed, the
 * window keeps its planned length from now.
 */
async function openWindow(
  db: Database,
  row: MaintenanceWithRelations,
  at: number,
  body: string,
  automatic: boolean,
): Promise<MaintenanceUpdateRow> {
  const duration = row.endTime - row.startTime;
  const windowEnd = row.windowEnd > at ? row.windowEnd : at + duration;
  const claimed = await claimWindow(db, row, { status: 'IN_PROGRESS', windowEnd, updateTime: at });
  if (!claimed) {
    return latestUpdate(db, row.id);
  }
  await coverComponents(
    db,
    row.components.map((item) => item.componentId),
    at,
  );
  return insertUpdate(db, row.id, 'IN_PROGRESS', body, automatic, at);
}

/**
 * Closes the tracked window. A series rolls on to its next window and goes
 * back to SCHEDULED; anything else is COMPLETED. The timeline entry says
 * COMPLETED either way: it describes the window, not the series.
 */
async function closeWindow(
  db: Database,
  row: MaintenanceWithRelations,
  at: number,
  body: string,
  automatic: boolean,
): Promise<MaintenanceUpdateRow> {
  const next = row.recurrence ? nextWindow(scheduleOf(row), at, row.windowStart) : undefined;
  const claimed = await claimWindow(
    db,
    row,
    next
      ? { status: 'SCHEDULED', windowStart: next.start, windowEnd: next.end, updateTime: at }
      : { status: 'COMPLETED', updateTime: at },
  );
  if (!claimed) {
    return latestUpdate(db, row.id);
  }
  if (row.status === 'IN_PROGRESS') {
    await releaseComponents(
      db,
      row.id,
      row.components.map((item) => item.componentId),
      at,
    );
  }
  return insertUpdate(db, row.id, 'COMPLETED', body, automatic, at);
}

async function cancel(
  db: Database,
  row: MaintenanceWithRelations,
  at: number,
  body: string,
): Promise<MaintenanceUpdateRow> {
  if (row.status === 'IN_PROGRESS') {
    await releaseComponents(
      db,
      row.id,
      row.components.map((item) => item.componentId),
      at,
    );
  }
  await db
    .update(maintenances)
    .set({ status: 'CANCELLED', updateTime: at })
    .where(eq(maintenances.id, row.id));
  return insertUpdate(db, row.id, 'CANCELLED', body, false, at);
}

/**
 * Moves one maintenance to where the clock says it should be. Idempotent: a
 * row already where it belongs is left alone, so this can run on every read
 * as well as on every timer.
 */
async function reconcileOne(db: Database, row: MaintenanceWithRelations, now: number) {
  if (row.status === 'SCHEDULED') {
    if (now >= row.windowEnd) {
      // The whole window went by unnoticed, so it never opened; opening it
      // late would announce a maintenance that is not happening.
      await closeWindow(db, row, now, MAINTENANCE_COPY.elapsed, true);
      return;
    }
    if (now >= row.windowStart) {
      await openWindow(db, row, now, MAINTENANCE_COPY.started, true);
    }
    return;
  }
  if (row.status === 'IN_PROGRESS' && now >= row.windowEnd) {
    await closeWindow(db, row, now, MAINTENANCE_COPY.completed, true);
  }
}

/**
 * Brings every active maintenance up to date with the clock. Runs from the
 * scheduler and, because a local dev server has no scheduler, from reads
 * too. It only writes when a window boundary has passed.
 */
export async function reconcileMaintenances(db: Database, now = nowMs()): Promise<void> {
  const due = await db
    .select()
    .from(maintenances)
    .where(
      and(
        inArray(maintenances.status, ACTIVE_STATUSES),
        sql`(case ${maintenances.status} when 'SCHEDULED' then ${maintenances.windowStart} else ${maintenances.windowEnd} end) <= ${now}`,
      ),
    )
    .all();
  if (due.length === 0) {
    return;
  }
  for (const row of await attachMaintenanceRelations(db, due)) {
    await reconcileOne(db, row, now);
  }
}

/** The next instant any maintenance changes state on its own, if one is pending. */
export async function nextMaintenanceBoundary(db: Database): Promise<number | undefined> {
  const row = await db
    .select({
      boundary: sql<number>`min(case ${maintenances.status} when 'SCHEDULED' then ${maintenances.windowStart} else ${maintenances.windowEnd} end)`,
    })
    .from(maintenances)
    .where(inArray(maintenances.status, ACTIVE_STATUSES))
    .get();
  return row?.boundary == null ? undefined : Number(row.boundary);
}

export async function createMaintenance(
  db: Database,
  input: {
    title: string;
    body: string;
    componentIds: string[];
    /** Omitted starts the maintenance now. */
    startTime?: number;
    durationMs: number;
    recurrence?: MaintenanceRecurrence | null;
    timeZone: string;
  },
): Promise<MaintenanceWithRelations> {
  const now = nowMs();
  const startTime = input.startTime ?? now;
  const endTime = startTime + input.durationMs;
  const recurrence = input.recurrence ?? null;
  const window = nextWindow({ startTime, endTime, recurrence, timeZone: input.timeZone }, now);
  if (!window) {
    throw new MaintenanceStateError('The schedule has no window left to run.');
  }
  const row: MaintenanceRow = {
    id: createId('mnt'),
    title: input.title,
    status: 'SCHEDULED',
    startTime,
    endTime,
    windowStart: window.start,
    windowEnd: window.end,
    recurrence,
    timeZone: input.timeZone,
    createTime: now,
    updateTime: now,
  };
  const componentIds = [...new Set(input.componentIds)];
  await db.batch([
    db.insert(maintenances).values(row),
    db.insert(maintenanceUpdates).values({
      id: createId('mup'),
      maintenanceId: row.id,
      status: 'SCHEDULED',
      body: input.body,
      automatic: false,
      createTime: now,
    }),
    ...(componentIds.length
      ? [
          db
            .insert(maintenanceComponents)
            .values(componentIds.map((componentId) => ({ maintenanceId: row.id, componentId }))),
        ]
      : []),
  ]);
  // A maintenance starting now opens on the spot rather than on the next tick.
  await reconcileOne(db, await loadOrThrow(db, row.id), now);
  return loadOrThrow(db, row.id);
}

/**
 * Edits. What may change depends on where the maintenance is: the schedule
 * is open while it is SCHEDULED, only the end of the window while it is
 * IN_PROGRESS, and only the words once it is over. `body` rewrites the
 * announcement, which is the oldest timeline entry.
 */
export async function updateMaintenance(
  db: Database,
  id: string,
  patch: {
    title?: string;
    body?: string;
    componentIds?: string[];
    startTime?: number;
    durationMs?: number;
    /** `null` turns a series into a one-off. */
    recurrence?: MaintenanceRecurrence | null;
    timeZone?: string;
  },
): Promise<MaintenanceWithRelations | undefined> {
  const existing = await getMaintenance(db, id);
  if (!existing) {
    return undefined;
  }
  const now = nowMs();
  const scheduleChanged =
    patch.startTime !== undefined || patch.recurrence !== undefined || patch.timeZone !== undefined;
  const existingDuration = existing.endTime - existing.startTime;
  const durationChanged = patch.durationMs !== undefined && patch.durationMs !== existingDuration;

  if (!isActiveMaintenanceStatus(existing.status) && (scheduleChanged || durationChanged)) {
    throw new MaintenanceStateError('A finished maintenance cannot be rescheduled.');
  }
  if (existing.status === 'IN_PROGRESS' && scheduleChanged) {
    throw new MaintenanceStateError(
      'A maintenance under way keeps its start and recurrence; only its end can move.',
    );
  }

  const next: Partial<MaintenanceRow> = { updateTime: now };
  if (patch.title !== undefined) {
    next.title = patch.title;
  }
  if (scheduleChanged || durationChanged) {
    const startTime = patch.startTime ?? existing.startTime;
    const duration = patch.durationMs ?? existing.endTime - existing.startTime;
    const recurrence =
      patch.recurrence === undefined ? (existing.recurrence ?? null) : patch.recurrence;
    const timeZone = patch.timeZone ?? existing.timeZone;
    next.startTime = startTime;
    next.endTime = startTime + duration;
    next.recurrence = recurrence;
    next.timeZone = timeZone;
    if (existing.status === 'IN_PROGRESS') {
      const plannedEnd = existing.windowStart + duration;
      next.windowEnd = plannedEnd > now ? plannedEnd : now + duration;
    } else {
      const window = nextWindow(
        { startTime, endTime: startTime + duration, recurrence, timeZone },
        now,
      );
      if (!window) {
        throw new MaintenanceStateError('The schedule has no window left to run.');
      }
      next.windowStart = window.start;
      next.windowEnd = window.end;
    }
  }
  await db.update(maintenances).set(next).where(eq(maintenances.id, id));

  if (patch.componentIds !== undefined) {
    const wanted = [...new Set(patch.componentIds)];
    const current = existing.components.map((item) => item.componentId);
    const added = wanted.filter((componentId) => !current.includes(componentId));
    const removed = current.filter((componentId) => !wanted.includes(componentId));
    if (removed.length) {
      await db
        .delete(maintenanceComponents)
        .where(
          and(
            eq(maintenanceComponents.maintenanceId, id),
            inArray(maintenanceComponents.componentId, removed),
          ),
        );
    }
    if (added.length) {
      await db
        .insert(maintenanceComponents)
        .values(added.map((componentId) => ({ maintenanceId: id, componentId })));
    }
    if (existing.status === 'IN_PROGRESS') {
      await releaseComponents(db, id, removed, now);
      await coverComponents(db, added, now);
    }
  }

  if (patch.body !== undefined) {
    const announcement = existing.updates[existing.updates.length - 1];
    if (announcement) {
      await db
        .update(maintenanceUpdates)
        .set({ body: patch.body })
        .where(eq(maintenanceUpdates.id, announcement.id));
    }
  }

  // Rescheduled to "now" means now.
  await reconcileOne(db, await loadOrThrow(db, id), now);
  return getMaintenance(db, id);
}

/**
 * Removes a maintenance. A window under way releases its components first,
 * so the page does not keep an unexplained "under maintenance".
 */
export async function deleteMaintenance(db: Database, id: string): Promise<boolean> {
  const existing = await getMaintenance(db, id);
  if (!existing) {
    return false;
  }
  if (existing.status === 'IN_PROGRESS') {
    await releaseComponents(
      db,
      id,
      existing.components.map((item) => item.componentId),
      nowMs(),
    );
  }
  const result = await db.delete(maintenances).where(eq(maintenances.id, id));
  return (result.meta.changes ?? 0) > 0;
}

/**
 * Posting an update is how an operator moves a maintenance by hand: the same
 * status again is a note; IN_PROGRESS opens the window early; COMPLETED
 * closes it early; CANCELLED calls the whole thing off. Anything else is a
 * transition the maintenance is not in a position to make.
 */
export async function addMaintenanceUpdate(
  db: Database,
  id: string,
  input: { status: MaintenanceStatus; body?: string },
): Promise<{ maintenance: MaintenanceWithRelations; update: MaintenanceUpdateRow } | undefined> {
  const existing = await getMaintenance(db, id);
  if (!existing) {
    return undefined;
  }
  const now = nowMs();
  let update: MaintenanceUpdateRow;

  if (input.status === existing.status) {
    if (input.body) {
      update = await insertUpdate(db, id, input.status, input.body, false, now);
    } else {
      // getMaintenance reconciles first, so Start/Complete against a window
      // the clock already moved lands here with no message.
      const latest = existing.updates[0];
      if (!latest?.automatic || latest.status !== input.status) {
        throw new MaintenanceStateError('A note needs a message.');
      }
      update = latest;
    }
  } else if (input.status === 'CANCELLED' && isActiveMaintenanceStatus(existing.status)) {
    update = await cancel(db, existing, now, input.body || MAINTENANCE_COPY.cancelled);
  } else if (input.status === 'IN_PROGRESS' && existing.status === 'SCHEDULED') {
    update = await openWindow(db, existing, now, input.body || MAINTENANCE_COPY.started, false);
  } else if (input.status === 'COMPLETED' && existing.status === 'IN_PROGRESS') {
    update = await closeWindow(db, existing, now, input.body || MAINTENANCE_COPY.completed, false);
  } else if (input.status === 'COMPLETED' && existing.status === 'SCHEDULED') {
    throw new MaintenanceStateError('Start the maintenance before completing it.');
  } else {
    throw new MaintenanceStateError(
      `A ${existing.status.toLowerCase().replace('_', ' ')} maintenance cannot move to ${input.status.toLowerCase().replace('_', ' ')}.`,
    );
  }

  return { maintenance: await loadOrThrow(db, id), update };
}
