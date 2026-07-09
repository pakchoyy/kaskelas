# PRD — Bantu Guru Yuk: Kas Kelas

## 1. Latar Belakang

Guru kelas SD/SMP saat ini mengelola kas kelas menggunakan Google Spreadsheet. Spreadsheet sulit digunakan di HP (tampilan tidak responsif, rawan salah input, tidak ada validasi). Guru membutuhkan aplikasi mobile yang nyaman namun tetap menyimpan data di Spreadsheet yang sudah mereka kenal.

---

## 2. Tujuan

Mengubah alur kerja kas kelas berbasis Spreadsheet menjadi aplikasi mobile yang:
- Mudah dioperasikan dengan satu tangan di HP
- Tetap menyimpan dan menyinkronkan data ke Google Spreadsheet
- Menghitung saldo secara otomatis
- Meminimalkan potensi kesalahan input

---

## 3. Ruang Lingkup

**Dalam Cakupan:**
- Pencatatan kas harian siswa (sistem checklist)
- Manajemen data siswa
- Pencatatan pemasukan lain dan pengeluaran
- Rekap saldo otomatis
- Sinkronisasi dua arah dengan Google Spreadsheet via Google Apps Script

**Di Luar Cakupan:**
- Multi-kelas (satu aplikasi = satu kelas)
- Login/autentikasi multi-user
- Notifikasi push
- Laporan PDF/cetak (fase berikutnya)

---

## 4. Target Pengguna

**Pengguna Utama:** Guru kelas SD/SMP yang mengelola kas kelas secara mandiri.

**Karakteristik:**
- Menggunakan HP Android (mayoritas)
- Tidak selalu melek teknologi
- Sudah terbiasa dengan Google Spreadsheet
- Menginput data di kelas saat siswa menyetor

---

## 5. Fitur

| Menu | Fitur |
|------|-------|
| Dashboard | Ringkasan saldo, aktivitas terkini, shortcut input |
| Siswa | CRUD daftar siswa |
| Kas | Checklist kas harian per siswa |
| Keuangan | Input pengeluaran & pemasukan lain |
| Rekap | Tabel rekap per siswa + saldo kelas |

---

## 6. Functional Requirements

### 6.1 Manajemen Siswa
- FR-01: Guru dapat menambah siswa (nama)
- FR-02: Guru dapat mengedit nama siswa
- FR-03: Guru dapat menghapus siswa (dengan konfirmasi)
- FR-04: Siswa ditampilkan dengan nomor urut

### 6.2 Kas Harian
- FR-05: Setiap hari Senin–Kamis, tampil daftar siswa dengan toggle checklist
- FR-06: Satu centang = nominal kas harian (dikonfigurasi, default Rp1.000)
- FR-07: Guru dapat mengubah tanggal untuk input retroaktif (maks 30 hari ke belakang)
- FR-08: Status checklist tersimpan per siswa per tanggal
- FR-09: Data kas tersinkron ke sheet "Kas" di Spreadsheet

### 6.3 Keuangan
- FR-10: Guru dapat mencatat pengeluaran (tanggal, nominal, keterangan)
- FR-11: Guru dapat mencatat pemasukan lain (tanggal, nominal, keterangan)
- FR-12: Daftar transaksi tampil urut tanggal terbaru
- FR-13: Data keuangan tersinkron ke sheet "Keuangan" di Spreadsheet

### 6.4 Rekap
- FR-14: Tampil total kas per siswa (jumlah hari × nominal harian)
- FR-15: Tampil total pemasukan (kas + pemasukan lain)
- FR-16: Tampil total pengeluaran
- FR-17: Tampil saldo kelas = total pemasukan − total pengeluaran
- FR-18: Rekap dapat di-refresh manual

### 6.5 Sinkronisasi
- FR-19: Data tersimpan lokal (localStorage) sebagai cache offline
- FR-20: Sinkronisasi ke Spreadsheet saat ada koneksi internet
- FR-21: Indikator status sinkronisasi (synced / pending / error)

### 6.6 Pengaturan
- FR-22: Guru dapat memasukkan URL Google Apps Script (Web App URL)
- FR-23: Guru dapat mengatur nominal kas harian
- FR-24: Guru dapat mengatur nama kelas / tahun pelajaran

---

## 7. Non-Functional Requirements

| ID | Kebutuhan |
|----|-----------|
| NFR-01 | Halaman utama (Dashboard) load < 2 detik |
| NFR-02 | Aplikasi tetap bisa dibuka offline (data dari cache) |
| NFR-03 | Ukuran tap target minimal 44px |
| NFR-04 | Desain Mobile First, lebar 360–430px |
| NFR-05 | Tidak ada autentikasi — sekali setup, langsung pakai |
| NFR-06 | Apps Script tidak boleh gagal diam-diam; selalu return status sukses/error |

---

## 8. Struktur Google Spreadsheet

### Sheet 1: `Siswa`
| No | Nama |
|----|------|
| 1  | Alea |

### Sheet 2: `Kas`
Kolom: `Tanggal | NamaSiswa | Status`
- Status: `1` (bayar) atau `0` (tidak bayar)
- Satu baris = satu siswa per tanggal

### Sheet 3: `Keuangan`
| Tanggal | Tipe | Nominal | Keterangan |
|---------|------|---------|------------|
| 17/7/25 | Pemasukan | 300 | Tinggalan kelas 1 |
| 18/7/25 | Pengeluaran | 32 | Tempat portfolio |

### Sheet 4: `Rekap` *(opsional, bisa digenerate otomatis oleh Apps Script)*
Ringkasan total per siswa dan saldo kelas.

---

## 9. Perhitungan Saldo

```
Total Kas Masuk     = Σ (checklist = 1) × nominal_harian
Total Pemasukan Lain = Σ pemasukan dari sheet Keuangan
Total Pengeluaran   = Σ pengeluaran dari sheet Keuangan

Saldo Kelas = Total Kas Masuk + Total Pemasukan Lain − Total Pengeluaran
```

---

## 10. Pengaturan

| Pengaturan | Default | Keterangan |
|------------|---------|------------|
| Web App URL | (kosong) | URL Google Apps Script |
| Nominal Kas Harian | Rp1.000 | Dapat diubah |
| Nama Kelas | (kosong) | Ditampilkan di header |
| Tahun Pelajaran | (kosong) | Ditampilkan di header |

---

## 11. Definition of Done

Sebuah fitur dianggap selesai jika:
- [ ] Berfungsi di tampilan mobile (360px)
- [ ] Data tersimpan ke localStorage
- [ ] Data tersinkron ke Google Spreadsheet
- [ ] Error ditampilkan ke pengguna (bukan hanya di console)
- [ ] Tidak ada breaking change pada struktur Spreadsheet
