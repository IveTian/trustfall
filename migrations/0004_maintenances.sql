-- Migration number: 0004 	 2026-09-03T00:00:00.000Z

-- A maintenance window or a recurring series of them. start_time/end_time
-- anchor the schedule; window_start/window_end are the window being tracked
-- now (under way, or next to open). recurrence is JSON, null for a one-off.
CREATE TABLE maintenances (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  window_end INTEGER NOT NULL,
  recurrence TEXT,
  time_zone TEXT NOT NULL DEFAULT 'UTC',
  create_time INTEGER NOT NULL,
  update_time INTEGER NOT NULL,
  CHECK (end_time > start_time AND window_end > window_start)
);

CREATE INDEX maintenances_status_idx ON maintenances(status);
CREATE INDEX maintenances_window_start_idx ON maintenances(window_start);

CREATE TABLE maintenance_components (
  maintenance_id TEXT NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  PRIMARY KEY (maintenance_id, component_id)
);

CREATE INDEX maintenance_components_component_id_idx
  ON maintenance_components(component_id);

CREATE TABLE maintenance_updates (
  id TEXT PRIMARY KEY NOT NULL,
  maintenance_id TEXT NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  body TEXT NOT NULL,
  automatic INTEGER NOT NULL DEFAULT 0,
  create_time INTEGER NOT NULL
);

CREATE INDEX maintenance_updates_maintenance_id_idx ON maintenance_updates(maintenance_id);
