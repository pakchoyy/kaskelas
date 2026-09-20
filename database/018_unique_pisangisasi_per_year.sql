-- Pisangisasi is recorded once per jamaah per year.
-- The UI stores each year on January 1st of that year.
CREATE UNIQUE INDEX IF NOT EXISTS unique_pisangisasi_per_year
  ON contributions(student_id, date)
  WHERE contribution_type = 'pisangisasi';
