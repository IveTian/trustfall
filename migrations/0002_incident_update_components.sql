-- Each timeline update remembers the affected set as it stood once the update
-- landed, so the detail page can show what every entry declared and draw how
-- each component's status moved over the incident's life. Display names are
-- frozen on the row, and component_id is not a live foreign key, so deleting
-- a component later does not wipe the history.
CREATE TABLE incident_update_components (
  update_id TEXT NOT NULL REFERENCES incident_updates(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (update_id, component_id)
);

CREATE INDEX incident_update_components_component_id_idx
  ON incident_update_components(component_id);

-- Backfill: existing updates get the incident's current affected set. A
-- resolving update reports every component back at operational, which is what
-- posting RESOLVED did to them.
INSERT INTO incident_update_components (update_id, component_id, display_name, status)
SELECT
  u.id,
  ic.component_id,
  c.display_name,
  CASE WHEN u.status = 'RESOLVED' THEN 'OPERATIONAL' ELSE ic.status END
FROM incident_updates u
JOIN incident_components ic ON ic.incident_id = u.incident_id
JOIN components c ON c.id = ic.component_id;
