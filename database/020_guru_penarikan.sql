-- ================================================
-- PENARIKAN TABUNGAN GURU (Bulanan & TW)
-- Jalankan SETELAH 019_notes_details.sql
-- Penarikan disimpan sebagai baris contributions bertipe baru,
-- nominal positif, tanpa periode. Saldo guru = setoran - penarikan.
-- Jalankan tiap baris satu per satu kalau editor SQL menolak sekaligus.
-- ================================================
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'tarik_guru_bulanan';
ALTER TYPE contribution_type ADD VALUE IF NOT EXISTS 'tarik_guru_tw';
