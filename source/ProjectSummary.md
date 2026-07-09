# Project Summary — Bantu Guru Yuk: Kas Kelas

## Tujuan Aplikasi

Mengganti Google Spreadsheet kas kelas dengan aplikasi mobile yang nyaman di HP, namun tetap menggunakan Spreadsheet sebagai database. Pengguna utama adalah guru kelas SD/SMP yang memegang kas kelas.

---

## Teknologi

| Layer | Teknologi |
|-------|-----------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State / Cache | localStorage (offline-first) |
| Backend | Google Apps Script (Web App) |
| Database | Google Spreadsheet |
| Build | Vite PWA plugin |
| Deploy | Vercel / GitHub Pages |

**Tidak menggunakan:** Supabase, Firebase, SQL database, atau backend server berbayar.

---

## Struktur Menu (Bottom Navigation)

```
[Dashboard] [Siswa] [Kas] [Keuangan] [Rekap]
```

| Menu | Fungsi Utama |
|------|-------------|
| Dashboard | Saldo kelas + shortcut input + 5 transaksi terkini |
| Siswa | CRUD daftar siswa |
| Kas | Checklist kas harian Senin–Kamis |
| Keuangan | Input pengeluaran & pemasukan lain |
| Rekap | Tabel rekap per siswa + saldo total |

Pengaturan diakses via ikon ⚙️ di header (bukan tab utama).

---

## Konsep UI

Mengikuti desain aplikasi **BGY Presensi** (sudah ada):
- Warna utama: teal gradient `#0ea5a0 → #0d7a8a → #2d6a7f`
- Background: putih / abu sangat muda
- Card: putih, border-radius 12px, shadow ringan
- Font: Segoe UI / system-ui
- Bottom Navigation: 5 ikon, label teks, aktif = teal
- FAB (Floating Action Button): teal, pojok kanan bawah
- Bottom Sheet: untuk form tambah/edit (bukan halaman penuh)
- Loading screen: logo BGY + gradient teal (sama persis dengan Presensi)

---

## Arsitektur

```
[Aplikasi React]
      |
      ├── localStorage (cache offline, antrian sync)
      |
      └── Google Apps Script (Web App URL)
                |
                └── Google Spreadsheet
                      ├── Sheet: Siswa
                      ├── Sheet: Kas
                      ├── Sheet: Keuangan
                      └── Sheet: Rekap (opsional)
```

**Pola sinkronisasi:**
1. Simpan ke localStorage dulu (instan, offline-safe)
2. Kirim ke Apps Script via `fetch` (POST JSON)
3. Apps Script tulis ke Spreadsheet
4. Jika gagal → masuk antrian, retry saat online

**Apps Script menyediakan endpoint:**
- `GET ?action=getData` → ambil semua data (siswa, kas, keuangan)
- `POST action=saveSiswa` → simpan/update daftar siswa
- `POST action=saveKas` → simpan data kas harian
- `POST action=saveKeuangan` → simpan transaksi keuangan
- `GET ?action=ping` → tes koneksi

---

## Prinsip Pengembangan

1. **Simpel lebih baik** — tidak ada fitur yang tidak diminta guru
2. **Mobile First** — desain dimulai dari layar 360px
3. **Offline-safe** — aplikasi tetap bisa dibuka dan dilihat tanpa internet
4. **Spreadsheet sebagai sumber kebenaran** — struktur sheet tidak boleh berubah setelah coding dimulai
5. **Satu file Apps Script** — semua endpoint dalam satu file `Code.gs`
6. **UI konsisten dengan BGY Presensi** — guru yang sudah pakai Presensi langsung familiar
