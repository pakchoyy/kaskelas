-- Allow Kwaru jamaah to use the fallback "Lainnya" blok from Excel imports.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_blok_check;
ALTER TABLE students
  ADD CONSTRAINT students_blok_check
  CHECK (blok IN ('etan', 'kulon', 'lainnya'));
