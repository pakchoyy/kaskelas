-- ================================================
-- MIGRATION 008: Kategori keuangan siswa/guru
-- ================================================

ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'siswa' CHECK (category IN ('siswa','guru'));

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008: kategori finance sisea/guru';
END $$;
