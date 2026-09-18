-- Allow Triwulan Jamaah to store one nominal per jamaah per triwulan.
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS check_paguyuban_period;

ALTER TABLE contributions ADD CONSTRAINT check_paguyuban_period CHECK (
  (contribution_type = 'paguyuban_ngaji' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal = 12000)
  OR (contribution_type = 'lks' AND period_month IS NOT NULL AND period_year IS NOT NULL)
  OR (contribution_type = 'tabungan_guru_bulanan' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type = 'tabungan_guru_tw' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type = 'ibu_kompor' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type = 'ibu_kas' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type = 'triwulan_jamaah' AND period_month IS NOT NULL AND period_year IS NOT NULL AND period_month BETWEEN 1 AND 4 AND nominal > 0)
  OR (contribution_type NOT IN ('paguyuban_ngaji','lks','tabungan_guru_bulanan','tabungan_guru_tw','ibu_kompor','ibu_kas','triwulan_jamaah') AND period_month IS NULL AND period_year IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_triwulan_jamaah_per_period
  ON contributions(student_id, period_year, period_month)
  WHERE contribution_type = 'triwulan_jamaah';
