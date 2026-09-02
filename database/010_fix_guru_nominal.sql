-- Allow any nominal for guru tabungan (not just 50000)
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS check_paguyuban_period;
ALTER TABLE contributions ADD CONSTRAINT check_paguyuban_period CHECK (
  (contribution_type = 'paguyuban_ngaji' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal = 12000)
  OR (contribution_type = 'lks' AND period_month IS NOT NULL AND period_year IS NOT NULL)
  OR (contribution_type = 'tabungan_guru_bulanan' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type = 'tabungan_guru_tw' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal > 0)
  OR (contribution_type NOT IN ('paguyuban_ngaji','lks','tabungan_guru_bulanan','tabungan_guru_tw') AND period_month IS NULL AND period_year IS NULL)
);
