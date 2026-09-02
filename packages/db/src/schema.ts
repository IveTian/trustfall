import type { ComponentStatus, IncidentImpact, IncidentStatus } from '@trustfall/shared';
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
 * the incident touched at that moment, with the status the update left it in
 * and the name it had then. Component ids are stored without a live foreign
 * key so retiring a service does not erase the snapshot. A resolving update
 * records everything at OPERATIONAL.
 */
export const incidentUpdateComponents = sqliteTable(
  'incident_update_components',
  {
    updateId: text('update_id')
      .notNull()
      .references(() => incidentUpdates.id, { onDelete: 'cascade' }),
    componentId: text('component_id').notNull(),
    displayName: text('display_name').notNull(),
    status: text('status').$type<ComponentStatus>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.updateId, table.componentId] })],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
