-- Kwaru Ibu-ibu: Kompor & Kas (5000 bulanan)
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'ibu_kompor';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'ibu_kas';
-- NOTE: need separate transaction before INSERT, run inserts after commit
-- INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed) VALUES ('ibu_kompor', 5000, true) ON CONFLICT DO NOTHING;
-- INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed) VALUES ('ibu_kas', 5000, true) ON CONFLICT DO NOTHING;
