-- Generic "diserahkan" markers for period-based Kwaru contributions.
CREATE TABLE IF NOT EXISTS handover_markers (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  marker_key TEXT NOT NULL,
  handed_over BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (scope, marker_key)
);

CREATE INDEX IF NOT EXISTS idx_handover_markers_scope_key
  ON handover_markers(scope, marker_key);
