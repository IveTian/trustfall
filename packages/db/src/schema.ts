import type {
  ComponentStatus,
  IncidentImpact,
  IncidentStatus,
  MaintenanceRecurrence,
  MaintenanceStatus,
} from '@trustfall/shared';
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const componentGroups = sqliteTable('component_groups', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  position: integer('position').notNull().default(0),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
  updateTime: integer('update_time', { mode: 'number' }).notNull(),
});

export const components = sqliteTable('components', {
  id: text('id').primaryKey(),
  groupId: text('group_id').references(() => componentGroups.id, { onDelete: 'set null' }),
  displayName: text('display_name').notNull(),
  description: text('description'),
  status: text('status').$type<ComponentStatus>().notNull().default('OPERATIONAL'),
  position: integer('position').notNull().default(0),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
  updateTime: integer('update_time', { mode: 'number' }).notNull(),
});

export const incidents = sqliteTable('incidents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').$type<IncidentStatus>().notNull().default('INVESTIGATING'),
  impact: text('impact').$type<IncidentImpact>().notNull().default('MINOR'),
  startTime: integer('start_time', { mode: 'number' }).notNull(),
  resolveTime: integer('resolve_time', { mode: 'number' }),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
  updateTime: integer('update_time', { mode: 'number' }).notNull(),
});

export const incidentComponents = sqliteTable(
  'incident_components',
  {
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    componentId: text('component_id')
      .notNull()
      .references(() => components.id, { onDelete: 'cascade' }),
    status: text('status').$type<ComponentStatus>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.incidentId, table.componentId] })],
);

export const incidentUpdates = sqliteTable('incident_updates', {
  id: text('id').primaryKey(),
  incidentId: text('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  status: text('status').$type<IncidentStatus>().notNull(),
  body: text('body').notNull(),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
});

/**
 * The affected set as it stood once an update landed: one row per component
 * the incident touched at that moment, with the status the update left it in.
 * A resolving update records everything at OPERATIONAL.
 */
export const incidentUpdateComponents = sqliteTable(
  'incident_update_components',
  {
    updateId: text('update_id')
      .notNull()
      .references(() => incidentUpdates.id, { onDelete: 'cascade' }),
    componentId: text('component_id')
      .notNull()
      .references(() => components.id, { onDelete: 'cascade' }),
    status: text('status').$type<ComponentStatus>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.updateId, table.componentId] })],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const inviteLinks = sqliteTable('invite_links', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  maxUses: integer('max_uses').notNull(),
  useCount: integer('use_count').notNull().default(0),
  createdBy: text('created_by').notNull(),
  revokeTime: integer('revoke_time', { mode: 'number' }),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
  updateTime: integer('update_time', { mode: 'number' }).notNull(),
});

/**
 * A maintenance window, or a series of them. `startTime`/`endTime` anchor the
 * schedule (the first window); `windowStart`/`windowEnd` are the window the
 * row is tracking now: the one under way, or the next to open. For a one-off
 * the two pairs start out equal.
 */
export const maintenances = sqliteTable('maintenances', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').$type<MaintenanceStatus>().notNull().default('SCHEDULED'),
  startTime: integer('start_time', { mode: 'number' }).notNull(),
  endTime: integer('end_time', { mode: 'number' }).notNull(),
  windowStart: integer('window_start', { mode: 'number' }).notNull(),
  windowEnd: integer('window_end', { mode: 'number' }).notNull(),
  recurrence: text('recurrence', { mode: 'json' }).$type<MaintenanceRecurrence | null>(),
  timeZone: text('time_zone').notNull().default('UTC'),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
  updateTime: integer('update_time', { mode: 'number' }).notNull(),
});

export const maintenanceComponents = sqliteTable(
  'maintenance_components',
  {
    maintenanceId: text('maintenance_id')
      .notNull()
      .references(() => maintenances.id, { onDelete: 'cascade' }),
    componentId: text('component_id')
      .notNull()
      .references(() => components.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.maintenanceId, table.componentId] })],
);

/**
 * The maintenance's timeline. `automatic` marks entries the scheduler wrote
 * when a window opened or closed on its own, as opposed to an operator's word.
 */
export const maintenanceUpdates = sqliteTable('maintenance_updates', {
  id: text('id').primaryKey(),
  maintenanceId: text('maintenance_id')
    .notNull()
    .references(() => maintenances.id, { onDelete: 'cascade' }),
  status: text('status').$type<MaintenanceStatus>().notNull(),
  body: text('body').notNull(),
  automatic: integer('automatic', { mode: 'boolean' }).notNull().default(false),
  createTime: integer('create_time', { mode: 'number' }).notNull(),
});
