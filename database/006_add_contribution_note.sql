-- ================================================
-- MIGRATION 006: Tambah kolom note di contributions
-- untuk keperluan penarikan tabungan per siswa
-- ================================================

ALTER TABLE contributions ADD COLUMN IF NOT EXISTS note TEXT;

-- Index tidak perlu, note hanya untuk display

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 006: kolom note ditambahkan ke contributions';
END $$;
