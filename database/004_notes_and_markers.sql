-- ================================================
-- NOTES & AMAL JUMAT MARKERS SCHEMA
-- Aplikasi: Kas Kelas
-- Version: 1.1
-- Date: 2026-08-18
-- ================================================
-- Fitur baru:
--  - notes: catatan per periode (Kas Kelas per minggu, Tabungan per hari)
--  - amal_jumat_markers: penanda "diserahkan" uang Amal Jumat per Jumat
-- Jalankan script ini SETELAH 001_create_schema.sql
-- ================================================

-- ================================================
-- TABLE: notes
-- ================================================

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  period_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT check_note_text_not_empty
    CHECK (LENGTH(TRIM(text)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_notes_scope_period
  ON notes(scope, period_key);

-- ================================================
-- TABLE: amal_jumat_markers
-- ================================================

CREATE TABLE IF NOT EXISTS amal_jumat_markers (
  id TEXT PRIMARY KEY,
  friday_date TEXT NOT NULL UNIQUE,
  handed_over BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Notes & markers schema created successfully!';
  RAISE NOTICE '📋 Tables created: notes, amal_jumat_markers';
END $$;
