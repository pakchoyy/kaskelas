-- Scope separation (kaskelas vs kwaru) + blok Etan/Kulon
ALTER TABLE students ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'kaskelas';
ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'kaskelas';
ALTER TABLE students ADD COLUMN IF NOT EXISTS blok TEXT CHECK (blok IN ('etan','kulon'));
-- NOTE: contributions ikut scope via student join, tidak perlu kolom sendiri
