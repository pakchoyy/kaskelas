import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const siswaSheet = XLSX.utils.json_to_sheet([{ Nama: 'Alea' }, { Nama: 'Budi' }, { Nama: 'Citra' }]);
const siswaBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(siswaBook, siswaSheet, 'Siswa');
writeFileSync(resolve(root, 'public/template-siswa.xlsx'), XLSX.write(siswaBook, { type: 'buffer', bookType: 'xlsx' }));

const keuanganSheet = XLSX.utils.json_to_sheet([
  { Tanggal: '2025-07-17', Tipe: 'Pengeluaran', Nominal: 32000, Keterangan: 'Tempat portfolio' },
  { Tanggal: '2025-07-18', Tipe: 'Pemasukan', Nominal: 50000, Keterangan: 'Sumbangan orang tua' },
]);
const keuanganBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(keuanganBook, keuanganSheet, 'Keuangan');
writeFileSync(resolve(root, 'public/template-keuangan.xlsx'), XLSX.write(keuanganBook, { type: 'buffer', bookType: 'xlsx' }));

console.log('Template Excel dibuat: template-siswa.xlsx, template-keuangan.xlsx');
