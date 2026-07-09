# Panduan Setup Spreadsheet & Google Apps Script

Ikuti langkah berurutan. Jangan lewati langkah 0 dan langkah 4 karena itu paling sering lupa.

## 0. Siapkan Spreadsheet dulu

1. Buka https://docs.google.com/spreadsheets
2. Buat Spreadsheet baru, misalnya `Kas Kelas 6A`
3. Biarkan kosong, sheet default boleh dihapus/diubah namanya bebas karena `Code.gs` akan membuat sheet berikut secara otomatis:
   - `Siswa`
   - `Kas`
   - `Keuangan`
4. Salin ID Spreadsheet dari URL:
   - URL bentuknya: `https://docs.google.com/spreadsheets/d/ID_SPREADSHEET_INGIN_DIAMBIL/edit`
   - Bagian `ID_SPREADSHEET_INGIN_DIAMBIL` adalah ID-nya (panjang, campuran huruf/angka).
5. Simpan ID ini, dipakai di langkah 2.

## 1. Buka Google Apps Script

1. Buka https://script.google.com
2. Klik `New Project`
3. Hapus isi default `Code.gs`
4. Copy seluruh isi file `Code.gs` dari project ini ke editor.

## 2. Isi SPREADSHEET_ID

Di paling atas `Code.gs`, ubah baris:

```javascript
var SPREADSHEET_ID = '';
```

menjadi:

```javascript
var SPREADSHEET_ID = 'ID_SPREADSHEET_DARI_LANGKAH_0';
```

Simpan project (`Ctrl/Cmd + S`).

## 3. Deploy sebagai Web App

1. Klik `Deploy` → `New deployment`
2. Pilih tipe `Web app`
3. `Execute as`: `Me`
4. `Who has access`: `Anyone` (diperlukan agar fetch dari browser HP bisa jalan)
5. Klik `Deploy`
6. Setujui izin jika Google meminta akses ke Spreadsheet.
7. Copy `Web app URL` yang diberikan, bentuknya:
   `https://script.google.com/macros/s/XXXXXX/exec`

## 4. Masukkan URL ke aplikasi

1. Buka aplikasi Kas Kelas di HP/browser.
2. Tap ikon ⚙️ → `Pengaturan`.
3. Tempel `Web app URL` ke kolom `Web App URL`.
4. Isi juga `Nominal Kas Harian`, `Nama Kelas`, `Tahun Pelajaran`.
5. Tap `Simpan`.
6. Tap `Tes Koneksi`.
   - Berhasil: muncul `Terhubung ke Apps Script.`
   - Gagal: periksa URL, izin deploy, dan koneksi internet.

## 5. Sinkronisasi

- Setelah data diisi, badge di header akan menunjukkan status:
  - `Pending` → ada perubahan yang belum terkirim
  - `Synced` → sudah tersimpan ke Spreadsheet
  - `Error` → gagal kirim, cek URL/izin/koneksi
- Tap badge untuk memaksa sinkron manual.
- Di menu `Rekap`, tombol `Refresh` akan menarik data terbaru dari Spreadsheet.

## Catatan struktur sheet (jangan diubah setelah dipakai)

- `Siswa`: `No | Nama | StudentId | CreatedAt | UpdatedAt`
- `Kas`: `Tanggal | NamaSiswa | Status | StudentId | UpdatedAt`
- `Keuangan`: `Tanggal | Tipe | Nominal | Keterangan | TransactionId | CreatedAt | UpdatedAt`

Kolom tambahan seperti `StudentId`/`TransactionId` dipakai agar sinkron dua arah tetap stabil saat ada nama sama.
