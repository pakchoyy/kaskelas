-- ================================================
-- TEST DATA & CONSTRAINT VALIDATION
-- Aplikasi: Kas Kelas
-- ================================================
-- IMPORTANT: Jalankan script ini SETELAH 001_create_schema.sql
-- Script ini akan melakukan INSERT test data dan validasi constraint
-- Semua test data akan di-ROLLBACK di akhir
-- ================================================

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '🧪 Starting constraint validation tests...';
END $$;

-- ================================================
-- TEST 1: Insert Students
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 1: Insert students...';
END $$;

INSERT INTO students (id, name, active, created_at, updated_at) VALUES
  ('student-test-001', 'Test Student 1', true, NOW(), NOW()),
  ('student-test-002', 'Test Student 2', true, NOW(), NOW()),
  ('student-test-003', 'Test Student Inactive', false, NOW(), NOW());

-- Verify
SELECT 
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ TEST 1 PASSED: 3 students inserted'
    ELSE '❌ TEST 1 FAILED: Expected 3 students, got ' || COUNT(*)::text
  END AS result
FROM students
WHERE id LIKE 'student-test-%';

-- ================================================
-- TEST 2: Insert Kas Kelas (nominal dapat berbeda)
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 2: Insert Kas Kelas contributions...';
END $$;

-- Kas Kelas dengan nominal 2000 (Selasa)
INSERT INTO contributions (
  id, student_id, contribution_type, date, nominal,
  period_month, period_year, created_at, updated_at
) VALUES (
  'contrib-test-001',
  'student-test-001',
  'kas_kelas',
  '2026-08-11',  -- Selasa
  2000,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- Kas Kelas dengan nominal berbeda (Rabu)
INSERT INTO contributions (
  id, student_id, contribution_type, date, nominal,
  period_month, period_year, created_at, updated_at
) VALUES (
  'contrib-test-002',
  'student-test-001',
  'kas_kelas',
  '2026-08-12',  -- Rabu
  3000,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- Verify
SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ TEST 2 PASSED: Kas Kelas inserted with different nominals'
    ELSE '❌ TEST 2 FAILED: Expected 2 Kas Kelas records'
  END AS result
FROM contributions
WHERE contribution_type = 'kas_kelas' AND id LIKE 'contrib-test-%';

-- ================================================
-- TEST 3: Amal Jumat - HARUS hari Jumat
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 3: Amal Jumat validation (must be Friday)...';
END $$;

-- Valid: Jumat 14 Agustus 2026
INSERT INTO contributions (
  id, student_id, contribution_type, date, nominal,
  period_month, period_year, created_at, updated_at
) VALUES (
  'contrib-test-003',
  'student-test-001',
  'amal_jumat',
  '2026-08-14',  -- Jumat
  5000,
  NULL,
  NULL,
  NOW(),
  NOW()
);

-- Verify success
SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ TEST 3.1 PASSED: Amal Jumat on Friday accepted'
    ELSE '❌ TEST 3.1 FAILED: Amal Jumat not inserted'
  END AS result
FROM contributions
WHERE contribution_type = 'amal_jumat' AND id = 'contrib-test-003';

-- Invalid: Selasa (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO contributions (
      id, student_id, contribution_type, date, nominal,
      period_month, period_year, created_at, updated_at
    ) VALUES (
      'contrib-test-004',
      'student-test-001',
      'amal_jumat',
      '2026-08-11',  -- Selasa (bukan Jumat)
      5000,
      NULL,
      NULL,
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 3.2 FAILED: Amal Jumat on Tuesday should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ TEST 3.2 PASSED: Amal Jumat on Tuesday correctly rejected (check_amal_jumat_friday)';
  END;
END $$;

-- ================================================
-- TEST 4: Paguyuban Ngaji - HARUS nominal 12000
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 4: Paguyuban Ngaji validation (must be 12000)...';
END $$;

-- Valid: nominal 12000 dengan period
INSERT INTO contributions (
  id, student_id, contribution_type, date, nominal,
  period_month, period_year, created_at, updated_at
) VALUES (
  'contrib-test-005',
  'student-test-001',
  'paguyuban_ngaji',
  '2026-08-10',
  12000,
  8,     -- Agustus
  2026,
  NOW(),
  NOW()
);

-- Verify success
SELECT 
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ TEST 4.1 PASSED: Paguyuban Ngaji with 12000 accepted'
    ELSE '❌ TEST 4.1 FAILED: Paguyuban Ngaji not inserted'
  END AS result
FROM contributions
WHERE contribution_type = 'paguyuban_ngaji' AND id = 'contrib-test-005';

-- Invalid: nominal bukan 12000 (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO contributions (
      id, student_id, contribution_type, date, nominal,
      period_month, period_year, created_at, updated_at
    ) VALUES (
      'contrib-test-006',
      'student-test-001',
      'paguyuban_ngaji',
      '2026-08-10',
      15000,  -- SALAH! Harus 12000
      8,
      2026,
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 4.2 FAILED: Paguyuban Ngaji with non-12000 nominal should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ TEST 4.2 PASSED: Paguyuban Ngaji with wrong nominal correctly rejected (check_paguyuban_period)';
  END;
END $$;

-- Invalid: tanpa period (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO contributions (
      id, student_id, contribution_type, date, nominal,
      period_month, period_year, created_at, updated_at
    ) VALUES (
      'contrib-test-007',
      'student-test-001',
      'paguyuban_ngaji',
      '2026-08-10',
      12000,
      NULL,   -- SALAH! Harus ada period_month
      NULL,   -- SALAH! Harus ada period_year
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 4.3 FAILED: Paguyuban Ngaji without period should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ TEST 4.3 PASSED: Paguyuban Ngaji without period correctly rejected (check_paguyuban_period)';
  END;
END $$;

-- ================================================
-- TEST 5: Duplicate Payment Prevention
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 5: Duplicate payment prevention...';
END $$;

-- Try duplicate Kas Kelas same day (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO contributions (
      id, student_id, contribution_type, date, nominal,
      period_month, period_year, created_at, updated_at
    ) VALUES (
      'contrib-test-008',
      'student-test-001',
      'kas_kelas',
      '2026-08-11',  -- Sudah ada di TEST 2
      2000,
      NULL,
      NULL,
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 5.1 FAILED: Duplicate Kas Kelas payment should be rejected';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ TEST 5.1 PASSED: Duplicate Kas Kelas correctly rejected (unique_kas_kelas_per_day)';
  END;
END $$;

-- Try duplicate Paguyuban Ngaji same period (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO contributions (
      id, student_id, contribution_type, date, nominal,
      period_month, period_year, created_at, updated_at
    ) VALUES (
      'contrib-test-009',
      'student-test-001',
      'paguyuban_ngaji',
      '2026-08-20',  -- Tanggal berbeda tapi...
      12000,
      8,             -- ...periode bulan sama
      2026,          -- ...periode tahun sama
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 5.2 FAILED: Duplicate Paguyuban Ngaji payment should be rejected';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ TEST 5.2 PASSED: Duplicate Paguyuban Ngaji correctly rejected (unique_paguyuban_per_month)';
  END;
END $$;

-- ================================================
-- TEST 6: Finance Transactions
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 6: Finance transactions...';
END $$;

-- Insert Pengeluaran
INSERT INTO finance_transactions (
  id, type, date, nominal, note, created_at, updated_at
) VALUES (
  'finance-test-001',
  'pengeluaran',
  '2026-08-11',
  50000,
  'Beli spidol untuk test',
  NOW(),
  NOW()
);

-- Insert Pemasukan
INSERT INTO finance_transactions (
  id, type, date, nominal, note, created_at, updated_at
) VALUES (
  'finance-test-002',
  'pemasukan',
  '2026-08-11',
  100000,
  'Sumbangan alumni untuk test',
  NOW(),
  NOW()
);

-- Verify
SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ TEST 6 PASSED: Finance transactions inserted'
    ELSE '❌ TEST 6 FAILED: Expected 2 finance transactions'
  END AS result
FROM finance_transactions
WHERE id LIKE 'finance-test-%';

-- Invalid: note kosong (should fail)
DO $$
BEGIN
  BEGIN
    INSERT INTO finance_transactions (
      id, type, date, nominal, note, created_at, updated_at
    ) VALUES (
      'finance-test-003',
      'pengeluaran',
      '2026-08-11',
      50000,
      '   ',  -- Note kosong (hanya spasi)
      NOW(),
      NOW()
    );
    RAISE NOTICE '❌ TEST 6.1 FAILED: Empty note should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ TEST 6.1 PASSED: Empty note correctly rejected (check_note_not_empty)';
  END;
END $$;

-- ================================================
-- TEST 7: Foreign Key Constraint (ON DELETE RESTRICT)
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '📝 TEST 7: Foreign key constraint (ON DELETE RESTRICT)...';
END $$;

-- Try to delete student yang punya riwayat pembayaran (should fail)
DO $$
BEGIN
  BEGIN
    DELETE FROM students WHERE id = 'student-test-001';
    RAISE NOTICE '❌ TEST 7 FAILED: Should not be able to delete student with payment history';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '✅ TEST 7 PASSED: Cannot delete student with payment history (fk_student RESTRICT)';
  END;
END $$;

-- ================================================
-- SUMMARY
-- ================================================

DO $$
DECLARE
  student_count INTEGER;
  contrib_count INTEGER;
  finance_count INTEGER;
  settings_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 TEST SUMMARY';
  RAISE NOTICE '================================================';
  
  SELECT COUNT(*) INTO student_count FROM students WHERE id LIKE 'student-test-%';
  SELECT COUNT(*) INTO contrib_count FROM contributions WHERE id LIKE 'contrib-test-%';
  SELECT COUNT(*) INTO finance_count FROM finance_transactions WHERE id LIKE 'finance-test-%';
  SELECT COUNT(*) INTO settings_count FROM contribution_settings;
  
  RAISE NOTICE 'Test Students: % records', student_count;
  RAISE NOTICE 'Test Contributions: % records', contrib_count;
  RAISE NOTICE 'Test Finance: % records', finance_count;
  RAISE NOTICE 'Contribution Settings: % records', settings_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All constraint validations completed!';
  RAISE NOTICE '🔄 Rolling back test data...';
END $$;

-- ================================================
-- ROLLBACK TEST DATA
-- ================================================

ROLLBACK;

DO $$
BEGIN
  RAISE NOTICE '✅ Test data rolled back successfully!';
  RAISE NOTICE '📝 Database is clean and ready for production use.';
END $$;
