-- ================================================
-- LKS CONTRIBUTION TYPE
-- Aplikasi: Kas Kelas
-- Version: 1.1
-- Date: 2026-08-20
-- ================================================
-- Fitur baru: "LKS" (Lembar Kerja Siswa) - salinan Paguyuban Ngaji
--  - Peride per SEMESTER (Semester 1 = period_month 1, Semester 2 = period_month 2) + tahun
--  - Nominal default 91000, bisa diubah (is_fixed = false)
-- Jalankan script ini SETELAH 004_notes_and_markers.sql
-- ================================================

-- STEP 1: Tambah enum value 'lks'
-- (dijalankan sendiri / terpisah dari yang lain karena enum value baru
--  tidak boleh dipakai di transaksi/tabel yang sama sebelum commit)

ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'lks';

-- STEP 2: Perbarui constraint check_paguyuban_period
-- agar LKS boleh punya period_month + period_year tanpa nominal tetap

ALTER TABLE contributions
  DROP CONSTRAINT IF EXISTS check_paguyuban_period;

ALTER TABLE contributions
  ADD CONSTRAINT check_paguyuban_period CHECK (
    (contribution_type = 'paguyuban_ngaji'
     AND period_month IS NOT NULL
     AND period_year IS NOT NULL
     AND nominal = 12000)
    OR
    (contribution_type = 'lks'
     AND period_month IS NOT NULL
     AND period_year IS NOT NULL)
    OR
    (contribution_type NOT IN ('paguyuban_ngaji', 'lks')
     AND period_month IS NULL
     AND period_year IS NULL)
  );

-- STEP 3: Unique index - 1 siswa hanya bayar 1x per semester
CREATE UNIQUE INDEX IF NOT EXISTS unique_lks_per_semester
  ON contributions(student_id, period_year, period_month)
  WHERE contribution_type = 'lks';

-- STEP 4: Seed contribution_settings untuk LKS (nominal default 91000, bisa diubah)
INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed)
VALUES ('lks', 91000, false)
ON CONFLICT (contribution_type) DO NOTHING;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ LKS schema updated successfully!';
  RAISE NOTICE '📋 Enum added: lks';
  RAISE NOTICE '🔒 Constraint & unique index updated';
  RAISE NOTICE '🌱 Seed inserted: lks = 91000 (editable)';
END $$;