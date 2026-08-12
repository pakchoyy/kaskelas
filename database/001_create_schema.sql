-- ================================================
-- NEON POSTGRESQL SCHEMA SETUP
-- Aplikasi: Kas Kelas
-- Version: 1.0
-- Date: 2026-08-11
-- ================================================

-- Drop existing objects if needed (untuk development)
-- DROP TABLE IF EXISTS contributions CASCADE;
-- DROP TABLE IF EXISTS finance_transactions CASCADE;
-- DROP TABLE IF EXISTS contribution_settings CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TYPE IF EXISTS contribution_type CASCADE;
-- DROP TYPE IF EXISTS transaction_type CASCADE;

-- ================================================
-- STEP 1: CREATE ENUMs
-- ================================================

CREATE TYPE contribution_type AS ENUM (
  'kas_kelas',
  'amal_jumat',
  'paguyuban_ngaji',
  'tabungan'
);

CREATE TYPE transaction_type AS ENUM (
  'pemasukan',
  'pengeluaran'
);

-- ================================================
-- STEP 2: CREATE TABLE students
-- ================================================

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for students
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_active ON students(active);

-- ================================================
-- STEP 3: CREATE TABLE contributions
-- ================================================

CREATE TABLE contributions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  contribution_type contribution_type NOT NULL,
  date DATE NOT NULL,
  nominal INTEGER NOT NULL,
  period_month INTEGER,
  period_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key dengan RESTRICT (tidak boleh hapus siswa yang punya riwayat)
  CONSTRAINT fk_student 
    FOREIGN KEY (student_id) 
    REFERENCES students(id) 
    ON DELETE RESTRICT,
  
  -- Business rules: nominal harus positif, kecuali tabungan yang boleh negatif (tarik)
  CONSTRAINT check_nominal_positive 
    CHECK (
      (contribution_type = 'tabungan' AND nominal <> 0)
      OR
      (contribution_type <> 'tabungan' AND nominal > 0)
    ),
  
  -- Business rules: Paguyuban Ngaji harus punya period dan nominal tetap 12000
  CONSTRAINT check_paguyuban_period 
    CHECK (
      (contribution_type = 'paguyuban_ngaji' 
       AND period_month IS NOT NULL 
       AND period_year IS NOT NULL
       AND nominal = 12000)
      OR
      (contribution_type != 'paguyuban_ngaji' 
       AND period_month IS NULL 
       AND period_year IS NULL)
    ),
  
  -- Business rules: Amal Jumat hanya boleh pada hari Jumat (day of week = 5)
  CONSTRAINT check_amal_jumat_friday
    CHECK (
      contribution_type != 'amal_jumat'
      OR
      EXTRACT(DOW FROM date) = 5
    )
);

-- Indexes untuk performa
CREATE INDEX idx_contributions_student ON contributions(student_id);
CREATE INDEX idx_contributions_type ON contributions(contribution_type);
CREATE INDEX idx_contributions_date ON contributions(date DESC);
CREATE INDEX idx_contributions_period ON contributions(period_year DESC, period_month DESC) 
  WHERE contribution_type = 'paguyuban_ngaji';

-- Unique constraints menggunakan UNIQUE INDEX dengan WHERE clause
-- Kas Kelas: 1 siswa tidak boleh bayar 2x di tanggal yang sama
CREATE UNIQUE INDEX unique_kas_kelas_per_day 
  ON contributions(student_id, date)
  WHERE contribution_type = 'kas_kelas';

-- Amal Jumat: 1 siswa tidak boleh bayar 2x di tanggal yang sama
CREATE UNIQUE INDEX unique_amal_jumat_per_day 
  ON contributions(student_id, date)
  WHERE contribution_type = 'amal_jumat';

-- Paguyuban Ngaji: 1 siswa tidak boleh bayar 2x untuk periode bulan yang sama
CREATE UNIQUE INDEX unique_paguyuban_per_month 
  ON contributions(student_id, period_year, period_month)
  WHERE contribution_type = 'paguyuban_ngaji';

-- ================================================
-- STEP 4: CREATE TABLE finance_transactions
-- ================================================

CREATE TABLE finance_transactions (
  id TEXT PRIMARY KEY,
  type transaction_type NOT NULL,
  date DATE NOT NULL,
  nominal INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Business rules: nominal harus positif
  CONSTRAINT check_nominal_positive 
    CHECK (nominal > 0),
  
  -- Business rules: note tidak boleh kosong
  CONSTRAINT check_note_not_empty 
    CHECK (LENGTH(TRIM(note)) > 0)
);

CREATE INDEX idx_finance_type ON finance_transactions(type);
CREATE INDEX idx_finance_date ON finance_transactions(date DESC);

-- ================================================
-- STEP 5: CREATE TABLE contribution_settings
-- ================================================

CREATE TABLE contribution_settings (
  id SERIAL PRIMARY KEY,
  contribution_type contribution_type NOT NULL UNIQUE,
  default_nominal INTEGER,
  is_fixed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Business rules: jika is_fixed true, default_nominal harus ada
  CONSTRAINT check_fixed_has_nominal
    CHECK (
      is_fixed = false 
      OR 
      (is_fixed = true AND default_nominal IS NOT NULL)
    )
);

-- ================================================
-- STEP 6: SEED contribution_settings
-- ================================================

INSERT INTO contribution_settings (contribution_type, default_nominal, is_fixed) VALUES
  ('kas_kelas', 2000, false),
  ('amal_jumat', NULL, false),
  ('paguyuban_ngaji', 12000, true);

-- ================================================
-- SUCCESS MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '📋 Tables created: students, contributions, finance_transactions, contribution_settings';
  RAISE NOTICE '🎯 ENUMs created: contribution_type, transaction_type';
  RAISE NOTICE '🔒 Constraints and indexes applied';
  RAISE NOTICE '🌱 Seed data inserted for contribution_settings';
END $$;
