-- Migration number: 0001 	 2026-08-31T00:00:00.000Z

CREATE TABLE component_groups (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  create_time INTEGER NOT NULL,
  update_time INTEGER NOT NULL
);

CREATE TABLE components (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT REFERENCES component_groups(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPERATIONAL',
  position INTEGER NOT NULL DEFAULT 0,
  create_time INTEGER NOT NULL,
  update_time INTEGER NOT NULL
);

CREATE INDEX components_group_id_idx ON components(group_id);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INVESTIGATING',
  impact TEXT NOT NULL DEFAULT 'MINOR',
  start_time INTEGER NOT NULL,
  resolve_time INTEGER,
  create_time INTEGER NOT NULL,
  update_time INTEGER NOT NULL
);

CREATE INDEX incidents_status_idx ON incidents(status);
CREATE INDEX incidents_start_time_idx ON incidents(start_time);

CREATE TABLE incident_components (
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  PRIMARY KEY (incident_id, component_id)
);

CREATE TABLE incident_updates (
  id TEXT PRIMARY KEY NOT NULL,
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  body TEXT NOT NULL,
  create_time INTEGER NOT NULL
);

CREATE INDEX incident_updates_incident_id_idx ON incident_updates(incident_id);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE "user" (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  image TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  role TEXT,
  banned INTEGER,
  "banReason" TEXT,
  "banExpires" INTEGER
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" INTEGER,
  "refreshTokenExpiresAt" INTEGER,
  scope TEXT,
  password TEXT,
  "createdAt" INTEGER NOT NULL,
  "updatedAt" INTEGER NOT NULL
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" INTEGER NOT NULL,
  "createdAt" INTEGER,
  "updatedAt" INTEGER
);
