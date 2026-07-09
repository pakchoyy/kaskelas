# Frozen Summary — Bantu Guru Yuk: Kas Kelas

> Keputusan-keputusan ini **tidak boleh diubah** selama proses pengembangan tanpa persetujuan eksplisit dari Product Owner.

---

## Teknologi & Infrastruktur

| Keputusan | Detail |
|-----------|--------|
| ✅ Frontend | React + Vite + TypeScript |
| ✅ Styling | Tailwind CSS |
| ✅ Database | Google Spreadsheet |
| ✅ Backend | Google Apps Script (satu file `Code.gs`) |
| ❌ Dilarang | Supabase |
| ❌ Dilarang | Firebase |
| ❌ Dilarang | Database SQL (PostgreSQL, MySQL, SQLite) |
| ❌ Dilarang | Backend server berbayar |

---

## Struktur Aplikasi

| Keputusan | Detail |
|-----------|--------|
| Bottom Navigation | 5 menu tetap: Dashboard, Siswa, Kas, Keuangan, Rekap |
| Pengaturan | Di-akses via ikon ⚙️ di header, bukan tab ke-6 |
| Jumlah halaman | Tidak ada penambahan menu utama tanpa persetujuan PO |

---

## Logika Bisnis

| Keputusan | Detail |
|-----------|--------|
| Hari kas | Senin–Kamis (Jumat/weekend boleh input dengan warning) |
| Satuan checklist | 1 centang = 1 nominal kas harian |
| Default nominal | Rp1.000 per hari |
| Nominal | Dikonfigurasi di Pengaturan, bukan hardcode |
| Satu kelas | Aplikasi hanya untuk satu kelas (tidak ada multi-kelas) |
| Tanpa login | Tidak ada autentikasi pengguna |

---

## Struktur Spreadsheet

Struktur sheet berikut **tidak boleh diubah** setelah implementasi dimulai:

**Sheet `Siswa`:** `No | Nama`

**Sheet `Kas`:** `Tanggal | NamaSiswa | Status (1/0)`

**Sheet `Keuangan`:** `Tanggal | Tipe | Nominal | Keterangan`

---

## Rumus Saldo (Tidak Boleh Berubah)

```
Saldo = (Σ kas masuk × nominal_harian) + Σ pemasukan_lain − Σ pengeluaran
```

---

## UI/UX

| Keputusan | Detail |
|-----------|--------|
| Referensi desain | UI mengikuti BGY Presensi (file `index.html` terlampir) |
| Warna utama | Teal gradient: `#0ea5a0 → #0d7a8a → #2d6a7f` |
| Prioritas | Mobile First — target layar 360–430px |
| Form input | Menggunakan bottom sheet, bukan halaman baru |
| Loading screen | Logo BGY + teal gradient (identik dengan Presensi) |

---

## Sinkronisasi

| Keputusan | Detail |
|-----------|--------|
| Pola | localStorage first, sync ke Spreadsheet via Apps Script |
| Offline | Aplikasi tetap bisa dibuka saat offline (baca cache) |
| Antrian | Data yang gagal sync masuk pending queue, retry saat online |
| Indikator | Selalu tampil status: ✓ synced / ⏳ pending / ✗ error |

---

## Yang Boleh Berubah (Tidak Frozen)

- Tampilan warna sekunder / aksen
- Teks label tombol
- Urutan item dalam daftar transaksi
- Penambahan field opsional di Pengaturan
- Fitur ekspor PDF (fase berikutnya, opsional)
