-- ================================================
-- MIGRATION 007: Mode Guru (9 guru, Tabungan Bulanan & TW 50k)
-- ================================================

-- Tambah kategori ke students (siswa/guru)
ALTER TABLE students ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'siswa' CHECK (category IN ('siswa','guru'));

-- Tambah enum baru untuk iuran guru (harus commit terpisah sebelum dipakai)
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'tabungan_guru_bulanan';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'tabungan_guru_tw';
-- NOTE: jalankan COMMIT; lalu baru INSERT di transaksi terpisah:
-- INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed)
-- VALUES ('tabungan_guru_bulanan', 50000, true) ON CONFLICT DO NOTHING;
-- INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed)
-- VALUES ('tabungan_guru_tw', 50000, true) ON CONFLICT DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 007: kategori siswa/guru + enum tabungan_guru';
END $$;
