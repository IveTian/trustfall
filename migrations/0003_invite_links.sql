-- Migration number: 0003 	 2026-09-02T00:00:00.000Z

CREATE TABLE invite_links (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  revoke_time INTEGER,
  create_time INTEGER NOT NULL,
  update_time INTEGER NOT NULL,
  CHECK (max_uses >= 1 AND use_count >= 0)
);

CREATE UNIQUE INDEX invite_links_token_idx ON invite_links(token);
CREATE INDEX invite_links_create_time_idx ON invite_links(create_time);
