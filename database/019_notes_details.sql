-- ================================================
-- NOTES: detail terstruktur (catatan pinjaman)
-- Jalankan SETELAH 018_unique_pisangisasi_per_year.sql
-- ================================================
ALTER TABLE notes ADD COLUMN IF NOT EXISTS details JSONB;
