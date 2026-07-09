# User Flow — Bantu Guru Yuk: Kas Kelas

---

## Alur Pertama Kali (Onboarding)

```
Buka aplikasi
  → Belum ada konfigurasi
  → Tampil layar Setup:
      1. Masukkan URL Google Apps Script
      2. Masukkan nominal kas harian (default: 1000)
      3. Masukkan nama kelas + tahun pelajaran
  → Tap "Mulai"
  → Redirect ke Dashboard
```

---

## 1. Dashboard

**Tujuan:** Ringkasan cepat kondisi kas kelas.

```
Buka aplikasi → Landing di Dashboard

Tampilan:
  - Header: Nama Kelas + Tahun Pelajaran
  - Card Saldo Kelas (angka besar, warna teal)
  - Card ringkasan: Total Masuk | Total Keluar
  - Shortcut: [+ Input Kas Hari Ini] [+ Pengeluaran]
  - Daftar 5 transaksi terkini
  - Indikator sinkronisasi (ikon cloud: ✓ synced / ⏳ pending / ✗ error)

Aksi:
  - Tap [+ Input Kas Hari Ini] → ke halaman Kas (tanggal = hari ini)
  - Tap [+ Pengeluaran] → ke form tambah pengeluaran
  - Tap transaksi → detail transaksi (read-only)
```

---

## 2. Siswa

**Tujuan:** Kelola daftar siswa kelas.

```
Tap menu "Siswa" di bottom nav

Tampilan:
  - Daftar siswa (No | Nama)
  - Tombol [+ Tambah Siswa] di kanan bawah (FAB)

### Tambah Siswa
  Tap FAB [+]
  → Form muncul (bottom sheet)
  → Input nama siswa
  → Tap [Simpan]
  → Siswa muncul di daftar
  → Sinkron ke sheet "Siswa"

### Edit Siswa
  Tap nama siswa → muncul opsi [Edit] [Hapus]
  Tap [Edit]
  → Form nama terbuka dengan nilai saat ini
  → Ubah nama → Tap [Simpan]
  → Sinkron ke sheet "Siswa"

### Hapus Siswa
  Tap nama siswa → [Hapus]
  → Dialog konfirmasi: "Hapus [Nama]? Data kas siswa ini juga akan terhapus."
  → Konfirmasi → Siswa dihapus
  → Sinkron ke sheet "Siswa"

Asumsi: Urutan siswa = urutan tambah. Tidak ada sorting otomatis.
```

---

## 3. Kas

**Tujuan:** Catat pembayaran kas harian siswa via checklist.

```
Tap menu "Kas" di bottom nav

Tampilan:
  - Header: tanggal aktif (default: hari ini)
  - Tombol navigasi tanggal: [< Kemarin] [Hari Ini] [Besok >]
    (Besok dinonaktifkan jika hari ini)
  - Daftar siswa + toggle checklist
  - Indikator: "X dari Y siswa sudah bayar"
  - Tombol [Simpan & Sinkron]

### Alur Input Kas
  Buka menu Kas
  → Tanggal = hari ini (atau ubah manual)
  → Cek apakah hari ini Senin–Kamis
      JIka Jumat/Sabtu/Minggu: tampil peringatan "Hari ini bukan hari kas"
      (tetap bisa input, tapi ada warning)
  → Tap toggle siswa yang bayar
  → Tap [Simpan & Sinkron]
  → Indikator berubah: ⏳ → ✓

### Input Retroaktif
  Tap tanggal di header
  → Kalender muncul (maks 30 hari ke belakang)
  → Pilih tanggal
  → Checklist terisi sesuai data yang sudah ada
  → Edit → [Simpan & Sinkron]

Asumsi: Tidak ada batas maksimum berapa kali guru boleh edit tanggal yang sama.
```

---

## 4. Keuangan

**Tujuan:** Catat pemasukan lain dan pengeluaran.

```
Tap menu "Keuangan" di bottom nav

Tampilan:
  - Tab: [Pengeluaran] [Pemasukan Lain]
  - Daftar transaksi urut tanggal terbaru
  - FAB [+] untuk tambah transaksi

### Tambah Pengeluaran
  Tap FAB [+] saat di tab Pengeluaran
  → Bottom sheet form:
      - Tanggal (default: hari ini)
      - Nominal (keyboard angka)
      - Keterangan (teks bebas)
  → Tap [Simpan]
  → Muncul di daftar
  → Sinkron ke sheet "Keuangan" (Tipe: Pengeluaran)

### Tambah Pemasukan Lain
  Tap tab [Pemasukan Lain] → FAB [+]
  → Bottom sheet form (sama seperti pengeluaran)
  → Tap [Simpan]
  → Sinkron ke sheet "Keuangan" (Tipe: Pemasukan)

### Edit / Hapus Transaksi
  Tap item transaksi → [Edit] atau [Hapus]
  Edit: ubah nilai → [Simpan]
  Hapus: konfirmasi → hapus → sinkron

Asumsi: Tidak ada validasi nominal maksimum.
```

---

## 5. Rekap

**Tujuan:** Lihat ringkasan kas seluruh siswa dan saldo kelas.

```
Tap menu "Rekap" di bottom nav

Tampilan:
  - Card Saldo Kelas (besar, teal)
  - Card ringkasan: Total Kas | Pemasukan Lain | Pengeluaran
  - Tabel per siswa:
      No | Nama | Jumlah Hari Bayar | Total (Rp)
  - Tombol [Refresh] di kanan atas

### Alur Rekap
  Buka Rekap
  → Data diambil dari cache lokal
  → Tap [Refresh] untuk sinkron ulang dari Spreadsheet
  → Tabel terupdate
  → Saldo terhitung otomatis

Asumsi: Rekap tidak otomatis refresh saat dibuka (hemat kuota). Guru tap manual jika ingin data terbaru.
```

---

## 6. Pengaturan

**Tujuan:** Konfigurasi awal dan perubahan parameter aplikasi.

```
Tap ikon ⚙️ di pojok kanan atas (bukan di bottom nav)

Tampilan:
  - Web App URL (Google Apps Script)
  - Nominal Kas Harian
  - Nama Kelas
  - Tahun Pelajaran
  - Tombol [Tes Koneksi]
  - Tombol [Simpan]

### Ubah Pengaturan
  Edit field yang ingin diubah
  → Tap [Simpan]
  → Toast: "Pengaturan tersimpan"

### Tes Koneksi
  Tap [Tes Koneksi]
  → Kirim request ping ke Apps Script
  → Jika sukses: "✓ Terhubung"
  → Jika gagal: "✗ Gagal. Periksa URL atau koneksi internet."
```

---

## Alur Sinkronisasi (Background)

```
Setiap aksi simpan:
  1. Data disimpan ke localStorage (instan)
  2. Request dikirim ke Apps Script
  3. Jika sukses → indikator ✓ synced
  4. Jika gagal → data masuk antrian pending
  5. Antrian dikirim ulang saat koneksi tersedia
```
