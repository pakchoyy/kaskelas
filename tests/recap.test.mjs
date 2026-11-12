// Tes uang: jalankan semua migrasi di Postgres tiruan (PGlite), lalu cek
// query Rekap asli dari api/recap.ts menghitung setoran dikurangi penarikan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('..', import.meta.url).pathname;
const dbDir = `${root}database`;

async function freshDb() {
  const db = new PGlite();
  const files = fs.readdirSync(dbDir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();
  const migrations = files.filter((f) => !/^00[23]_/.test(f)); // 002/003 hanya tes & verifikasi manual
  await db.exec(fs.readFileSync(`${dbDir}/${migrations[0]}`, 'utf8'));
  // Nilai enum baru harus ada sebelum dipakai di transaksi lain (sama seperti di Neon)
  for (const f of migrations.slice(1)) {
    for (const m of fs.readFileSync(`${dbDir}/${f}`, 'utf8').matchAll(/ALTER TYPE contribution_type ADD VALUE[^;]*;/g)) {
      await db.exec(m[0]);
    }
  }
  for (const f of migrations.slice(1)) await db.exec(fs.readFileSync(`${dbDir}/${f}`, 'utf8'));
  return db;
}

function recapSql() {
  const src = fs.readFileSync(`${root}api/recap.ts`, 'utf8');
  const m = src.match(/`(SELECT\s+s\.id,[\s\S]*?)`,\s*\[contributionType/);
  assert.ok(m, 'query per-siswa di api/recap.ts tidak ditemukan');
  return m[1];
}

async function seed(db) {
  await db.exec(`INSERT INTO students (id, name, active, category, scope) VALUES
    ('g1', 'Bu Ika', true, 'guru', 'kaskelas'),
    ('g2', 'Pak Sus', true, 'guru', 'kaskelas'),
    ('w1', 'Bu Waru', true, 'guru', 'kwaru')`);
  const ins = (id, sid, type, date, nom, pm, py, note = null) =>
    db.query(
      `INSERT INTO contributions (id, student_id, contribution_type, date, nominal, period_month, period_year, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, sid, type, date, nom, pm, py, note],
    );
  await ins('c1', 'g1', 'tabungan_guru_bulanan', '2026-10-05', 50000, 10, 2026);
  await ins('c2', 'g1', 'tabungan_guru_bulanan', '2026-11-05', 50000, 11, 2026);
  await ins('c3', 'g2', 'tabungan_guru_bulanan', '2026-11-05', 50000, 11, 2026);
  await ins('c4', 'w1', 'tabungan_guru_bulanan', '2026-11-05', 70000, 11, 2026);
  await ins('t1', 'g1', 'tarik_guru_bulanan', '2026-11-10', 30000, null, null, 'beli buku');
  await ins('t2', 'g1', 'tarik_guru_bulanan', '2026-11-11', 20000, null, null, 'bensin');
  await ins('w2', 'g1', 'tabungan_guru_tw', '2026-11-05', 50000, 4, 2026);
  return ins;
}

test('Rekap guru bulanan = setoran - penarikan, per scope', async () => {
  const db = await freshDb();
  await seed(db);
  const { rows } = await db.query(recapSql(), ['tabungan_guru_bulanan', 'guru', 'kaskelas', 'tarik_guru_bulanan']);
  assert.deepEqual(
    rows.map((r) => [r.name, Number(r.paidDays), Number(r.total)]),
    [['Bu Ika', 2, 50000], ['Pak Sus', 1, 50000]], // Bu Waru (scope kwaru) tidak ikut
  );
});

test('Penarikan Bulanan tidak mengurangi Tabungan TW', async () => {
  const db = await freshDb();
  await seed(db);
  const { rows } = await db.query(recapSql(), ['tabungan_guru_tw', 'guru', 'kaskelas', 'tarik_guru_tw']);
  assert.deepEqual(rows.map((r) => [r.name, Number(r.total)]), [['Bu Ika', 50000], ['Pak Sus', 0]]);
});

test('Jenis non-guru tidak terpengaruh penarikan', async () => {
  const db = await freshDb();
  await seed(db);
  const { rows } = await db.query(recapSql(), ['kas_kelas', 'guru', 'kaskelas', null]);
  assert.ok(rows.every((r) => Number(r.total) === 0));
});

test('Database menolak penarikan bernominal negatif atau berperiode', async () => {
  const db = await freshDb();
  const ins = await seed(db);
  await assert.rejects(ins('x1', 'g1', 'tarik_guru_bulanan', '2026-11-12', -5, null, null, 'x'));
  await assert.rejects(ins('x2', 'g1', 'tarik_guru_bulanan', '2026-11-12', 5, 11, 2026, 'x'));
});
