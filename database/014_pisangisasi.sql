ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'pisangisasi';
INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed, created_at, updated_at)
VALUES ('pisangisasi', NULL, false, NOW(), NOW())
ON CONFLICT DO NOTHING;
