-- Fix check_paguyuban_period to allow guru tabungan with period
ALTER TABLE contributions DROP CONSTRAINT IF EXISTS check_paguyuban_period;
ALTER TABLE contributions ADD CONSTRAINT check_paguyuban_period CHECK (
  (contribution_type = 'paguyuban_ngaji' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal = 12000)
  OR (contribution_type = 'lks' AND period_month IS NOT NULL AND period_year IS NOT NULL)
  OR (contribution_type = 'tabungan_guru_bulanan' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal = 50000)
  OR (contribution_type = 'tabungan_guru_tw' AND period_month IS NOT NULL AND period_year IS NOT NULL AND nominal = 50000)
  OR (contribution_type NOT IN ('paguyuban_ngaji','lks','tabungan_guru_bulanan','tabungan_guru_tw') AND period_month IS NULL AND period_year IS NULL)
);

-- Unique per month for guru bulanan
CREATE UNIQUE INDEX IF NOT EXISTS unique_guru_bulanan_per_month ON contributions(student_id, period_year, period_month) WHERE contribution_type = 'tabungan_guru_bulanan';
-- Unique per TW for guru TW
CREATE UNIQUE INDEX IF NOT EXISTS unique_guru_tw_per_period ON contributions(student_id, period_year, period_month) WHERE contribution_type = 'tabungan_guru_tw';
