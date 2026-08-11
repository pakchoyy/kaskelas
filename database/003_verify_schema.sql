-- ================================================
-- DATABASE VERIFICATION QUERIES
-- Aplikasi: Kas Kelas
-- ================================================
-- Jalankan script ini SETELAH 001_create_schema.sql berhasil
-- untuk memverifikasi struktur database
-- ================================================

\echo '================================================'
\echo '📊 DATABASE VERIFICATION'
\echo '================================================'
\echo ''

-- ================================================
-- 1. List All Tables
-- ================================================

\echo '1️⃣ LIST OF TABLES'
\echo '----------------'

SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

\echo ''

-- ================================================
-- 2. Table Structure - students
-- ================================================

\echo '2️⃣ TABLE: students'
\echo '----------------'

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
ORDER BY ordinal_position;

\echo ''

-- ================================================
-- 3. Table Structure - contributions
-- ================================================

\echo '3️⃣ TABLE: contributions'
\echo '----------------'

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contributions'
ORDER BY ordinal_position;

\echo ''

-- ================================================
-- 4. Table Structure - finance_transactions
-- ================================================

\echo '4️⃣ TABLE: finance_transactions'
\echo '----------------'

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'finance_transactions'
ORDER BY ordinal_position;

\echo ''

-- ================================================
-- 5. Table Structure - contribution_settings
-- ================================================

\echo '5️⃣ TABLE: contribution_settings'
\echo '----------------'

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contribution_settings'
ORDER BY ordinal_position;

\echo ''

-- ================================================
-- 6. List All ENUMs
-- ================================================

\echo '6️⃣ ENUM TYPES'
\echo '----------------'

SELECT 
  t.typname AS enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('contribution_type', 'transaction_type')
GROUP BY t.typname;

\echo ''

-- ================================================
-- 7. List All Constraints
-- ================================================

\echo '7️⃣ CONSTRAINTS'
\echo '----------------'

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  CASE 
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN
      (SELECT ccu.table_name || '(' || ccu.column_name || ')'
       FROM information_schema.constraint_column_usage ccu
       WHERE ccu.constraint_name = tc.constraint_name
       LIMIT 1)
    ELSE NULL
  END AS references
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('students', 'contributions', 'finance_transactions', 'contribution_settings')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo ''

-- ================================================
-- 8. List All Indexes
-- ================================================

\echo '8️⃣ INDEXES'
\echo '----------------'

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('students', 'contributions', 'finance_transactions', 'contribution_settings')
ORDER BY tablename, indexname;

\echo ''

-- ================================================
-- 9. Verify Seed Data - contribution_settings
-- ================================================

\echo '9️⃣ SEED DATA: contribution_settings'
\echo '----------------'

SELECT 
  id,
  contribution_type,
  default_nominal,
  is_fixed,
  created_at
FROM contribution_settings
ORDER BY id;

\echo ''

-- ================================================
-- 10. Foreign Key Details
-- ================================================

\echo '🔟 FOREIGN KEY DETAILS'
\echo '----------------'

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('students', 'contributions', 'finance_transactions', 'contribution_settings');

\echo ''

-- ================================================
-- 11. Check Constraints Details
-- ================================================

\echo '1️⃣1️⃣ CHECK CONSTRAINTS DETAILS'
\echo '----------------'

SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('students', 'contributions', 'finance_transactions', 'contribution_settings')
ORDER BY tc.table_name, tc.constraint_name;

\echo ''

-- ================================================
-- 12. Table Row Counts
-- ================================================

\echo '1️⃣2️⃣ TABLE ROW COUNTS'
\echo '----------------'

SELECT 
  'students' AS table_name,
  COUNT(*) AS row_count
FROM students
UNION ALL
SELECT 
  'contributions' AS table_name,
  COUNT(*) AS row_count
FROM contributions
UNION ALL
SELECT 
  'finance_transactions' AS table_name,
  COUNT(*) AS row_count
FROM finance_transactions
UNION ALL
SELECT 
  'contribution_settings' AS table_name,
  COUNT(*) AS row_count
FROM contribution_settings;

\echo ''
\echo '================================================'
\echo '✅ VERIFICATION COMPLETE'
\echo '================================================'
