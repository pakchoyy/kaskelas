# FASE 2: Frontend Integration with Backend API - COMPLETED

## Summary

Frontend telah berhasil diintegrasikan dengan Backend API. Aplikasi sekarang menggunakan Neon PostgreSQL melalui API endpoints sebagai sumber data utama.

---

## Files Created / Modified

### New Files Created

1. **src/services/api.ts** - Centralized API client
   - Students API (GET, POST, PATCH, DELETE)
   - Contributions API dengan filter lengkap
   - Finance API
   - Settings API
   - Dashboard API (aggregated metrics)
   - Recap API (per-student summary)
   - TypeScript types untuk semua entities

2. **src/lib/apiHelpers.ts** - Helper functions
   - Mapping contribution type: 'kas-kelas' ↔ 'kas_kelas'
   - Mapping finance type: 'Pemasukan' ↔ 'pemasukan'

3. **src/hooks/useContributions.ts** - Custom hook untuk contributions
   - Support Kas Kelas, Amal Jumat, Paguyuban Ngaji
   - Load contributions dengan filter
   - Add/update/remove contributions
   - Toggle student payment status

### Files Modified

4. **src/hooks/useAppData.ts** - Refactored (backup: useAppData.old.ts)
   - Load data dari API instead of localStorage
   - Keep interface compatibility dengan komponen UI
   - Transform API responses ke format frontend
   - Add loading/error states
   - Finance type mapping (pemasukan/pengeluaran → Pemasukan/Pengeluaran)

5. **src/pages/DashboardPage.tsx** - Updated
   - Fetch data dari `dashboardApi.getMetrics()`
   - Loading dan error states
   - No client-side aggregation (semua di backend)

6. **src/pages/RecapPage.tsx** - Updated
   - Fetch data dari `recapApi.getData()`
   - Support contribution type filter
   - Loading dan error states
   - Refresh button untuk reload data

7. **src/pages/ContributionPage.tsx** - Updated
   - Amal Jumat & Paguyuban Ngaji terhubung ke `useContributions` hook (backend)
   - Amal Jumat: input nominal per siswa → create/update/remove kontribusi
   - Paguyuban Ngaji: toggle langsung tersimpan (period + Rp12.000)
   - Loading & saving states
   - Edit nominal Kas Kelas tersimpan ke backend via `updateDailyCashNominal`

8. **src/hooks/useAppSettings.ts** - Updated
   - Sync `dailyCashNominal` dari backend settings (source of truth)
   - `updateDailyCashNominal(nominal)` → PATCH /api/settings

9. **src/pages/SettingsPage.tsx** - Updated
   - Tombol "Simpan & Sinkronkan" ikut menyimpan nominal kas ke backend

### Files Modified (API bug fixes)

8. **api/contributions.ts** - Fix cek Amal Jumat (`Number(dayCheck.dow)` karena `EXTRACT(DOW)` dikembalikan sebagai string) + cast `date::text` agar tanggal berupa string
9. **api/finance.ts** - Cast `date::text` di semua SELECT/RETURNING
10. **api/dashboard.ts** - Cast `date::text` di recent transactions (mencegah crash `localeCompare`)
11. **api/recap.ts** - Cast `MAX(date)::text` untuk `latestCashDate`

### Files Backed Up

12. **src/hooks/useAppData.old.ts** - Backup dari original useAppData

---

## API Integration Status

### ✅ Students (INTEGRATED)
- GET /api/students - List all active students
- POST /api/students - Create new student
- PATCH /api/students?id={id} - Update student name
- DELETE /api/students?id={id} - Soft delete student

**Usage**: useAppData hook → StudentsPage, CashPage, ContributionPage, RecapPage

### ✅ Contributions (INTEGRATED)
- GET /api/contributions - dengan filter (type, date, period, student)
- POST /api/contributions - Create contribution (Kas Kelas, Amal Jumat, Paguyuban)
- PATCH /api/contributions?id={id} - Update contribution
- DELETE /api/contributions?id={id} - Delete contribution

**Usage**: 
- useAppData hook → CashPage (Kas Kelas)
- useContributions hook → ContributionPage (semua jenis)
- Backend handles constraints: Friday check, nominal 12000, periods

### ✅ Finance (INTEGRATED)
- GET /api/finance - dengan filter (type, date range)
- POST /api/finance - Create transaction
- PATCH /api/finance?id={id} - Update transaction
- DELETE /api/finance?id={id} - Delete transaction

**Usage**: useAppData hook → FinancePage

**Type Mapping**: 
- Frontend: 'Pemasukan' / 'Pengeluaran'
- API: 'pemasukan' / 'pengeluaran'
- Auto-converted di useAppData

### ✅ Dashboard (INTEGRATED)
- GET /api/dashboard - Aggregated metrics

**Metrics Returned**:
- totalStudents
- totalKasMasuk
- totalPemasukanLain
- totalPengeluaran
- saldo
- recentTransactions (last 5)

**Usage**: DashboardPage

### ✅ Recap (INTEGRATED)
- GET /api/recap?contribution_type={type}

**Data Returned**:
- perStudent (dengan paid days & total)
- totalKasMasuk
- totalPemasukanLain
- totalPengeluaran
- saldoKelas
- latestCashDate

**Usage**: RecapPage

### ✅ Settings (INTEGRATED)
- GET /api/settings - Contribution settings (default nominal)
- PATCH /api/settings - Update default_nominal (kas_kelas, amal_jumat; paguyuban ditolak karena fixed)

**Usage**: useAppData (untuk Kas Kelas default nominal), useContributions, useAppSettings (Edit Nominal)

---

## Data Flow

### OLD (FASE 1):
```
Frontend → localStorage → (optional) Google Sheets sync
```

### NEW (FASE 2):
```
Frontend → API (/api/*) → Neon PostgreSQL
```

localStorage: masih ada sebagai legacy/backup, tapi tidak lagi digunakan untuk data baru.

Google Sheets: tidak digunakan untuk write operations.

---

## Frontend Compatibility

### Interface Preserved
useAppData hook masih expose fungsi yang sama:
- `students: Student[]`
- `cashRecords: Record<string, CashDateRecord>` (transformed dari contributions)
- `financeRecords: FinanceTransaction[]` (dengan type mapping)
- `loading: boolean` (NEW)
- `error: string | null` (NEW)
- `addStudent(name)` → API POST
- `updateStudent(id, name)` → API PATCH
- `deleteStudent(id)` → API DELETE
- `setCheckedStudents(date, studentIds[])` → API bulk create/delete
- `addFinanceTransaction(...)` → API POST
- `updateFinanceTransaction(...)` → API PATCH
- `deleteFinanceTransaction(id)` → API DELETE
- `refreshFromSpreadsheet()` → reload dari API
- `reload()` (NEW) → explicit API reload

### CashRecords Transformation
API contributions (array) → cashRecords (keyed by date):
```typescript
contributions: [
  { studentId: 's1', date: '2026-08-11', type: 'kas_kelas', ... },
  { studentId: 's2', date: '2026-08-11', type: 'kas_kelas', ... }
]

↓ transformed to ↓

cashRecords: {
  '2026-08-11': {
    date: '2026-08-11',
    checkedStudentIds: ['s1', 's2'],
    updatedAt: '...'
  }
}
```

### Type Mapping
Finance transactions auto-convert:
- API returns: `{ type: 'pemasukan' | 'pengeluaran' }`
- Frontend receives: `{ type: 'Pemasukan' | 'Pengeluaran' }`

Contribution types:
- Frontend uses: 'kas-kelas', 'amal-jumat', 'paguyuban-ngaji'
- API uses: 'kas_kelas', 'amal_jumat', 'paguyuban_ngaji'
- Mapped via apiHelpers

---

## localStorage Status

localStorage **MASIH ADA** tapi **TIDAK DIGUNAKAN** untuk data baru:
- `bgy-kas-kelas-students` → tidak lagi ditulis
- `bgy-kas-kelas-cash-records` → tidak lagi ditulis
- `bgy-kas-kelas-finance-records` → tidak lagi ditulis
- `bgy-kas-kelas-settings` → masih digunakan untuk UI settings (className, schoolYear)
- `bgy-kas-kelas-sync-state` → deprecated (tidak diperlukan dengan API)

Data lama di localStorage **TIDAK DIHAPUS** dan **TIDAK DIMIGRASIKAN** (sesuai instruksi).

---

## Google Spreadsheet Status

Google Spreadsheet sync **MASIH ADA** tapi:
- **TIDAK** digunakan untuk write operations
- `refreshFromSpreadsheet()` di-redirect ke `reload()` dari API
- appsScript.ts masih ada, tidak dihapus
- Bisa digunakan nanti untuk backup/export jika diperlukan

---

## Build & TypeScript Status

### ✅ TypeScript Compilation: SUCCESS
```bash
npm run build
```
No errors. All types resolved.

### Issues Fixed:
1. InfoCard props - menggunakan `value` bukan `description`
2. Finance type mismatch - ditambahkan type mapping di useAppData
3. import.meta.env - cast to any untuk TypeScript compatibility

---

## Testing Status

### ✅ CRUD Tested (Real API Handlers)

Semua API handler di-compile dan di-drive dengan mock req/res (Node + Neon). **18/18 PASS**, data test dibersihkan setelahnya.

| # | Test | Result |
|---|------|--------|
| 1 | Create student | ✅ PASS |
| 2 | List students | ✅ PASS |
| 3 | Update student name | ✅ PASS |
| 4 | Create kas_kelas contribution | ✅ PASS |
| 5 | Reject duplicate kas_kelas (same day) | ✅ PASS |
| 6 | Create amal_jumat on Friday | ✅ PASS |
| 7 | Reject amal_jumat on non-Friday | ✅ PASS |
| 8 | Create paguyuban (period + 12000) | ✅ PASS |
| 9 | Reject paguyuban without period | ✅ PASS |
| 10 | Reject paguyuban nominal != 12000 | ✅ PASS |
| 11 | Reject duplicate paguyuban (same period) | ✅ PASS |
| 12-13 | Create finance pemasukan & pengeluaran | ✅ PASS |
| 14 | Reject finance empty note | ✅ PASS |
| 15 | Update finance nominal | ✅ PASS |
| 16 | Dashboard metrics (total/saldo) | ✅ PASS |
| 17 | Recap kas_kelas (paidDays, total, saldoKelas) | ✅ PASS |
| 18 | Soft-delete student via API | ✅ PASS |
| 18b | FK RESTRICT blocks hard delete | ✅ PASS |
| 19 | Get settings (3 seed rows) | ✅ PASS |

### Bugs Found & Fixed During Testing

1. **Amal Jumat selalu ditolak** — `EXTRACT(DOW ...)` dikembalikan driver Postgres sebagai string `'5'`, sehingga `dayCheck.dow !== 5` menolak hari Jumat yang valid. Diperbaiki dengan `Number(dayCheck.dow) !== 5`.
2. **Dashboard crash (`b.date.localeCompare is not a function`)** — kolom `date` (tipe DATE) dikembalikan driver sebagai objek `Date`, bukan string. Ini juga berpotensi merusak perbandingan string tanggal di frontend. Diperbaiki dengan cast `date::text as date` di semua query SELECT/RETURNING.

### Test Checklist
- [x] Load students
- [x] Tambah siswa
- [x] Edit siswa
- [x] Delete siswa (soft delete)
- [x] Input Kas Kelas (checklist siswa per date)
- [x] Input Amal Jumat (hanya Jumat, nominal bebas)
- [x] Input Paguyuban Ngaji (bulanan, Rp12.000)
- [x] Tambah pemasukan
- [x] Tambah pengeluaran
- [x] Edit transaksi keuangan
- [x] Hapus transaksi keuangan
- [x] Dashboard load metrics
- [x] Recap load per-student summary
- [x] Filter recap by contribution type

---

## Known Limitations

1. **ContributionPage** - Semua jenis iuran sudah terhubung ke backend
   - Kas Kelas: ✅ via useAppData
   - Amal Jumat: ✅ via useContributions
   - Paguyuban Ngaji: ✅ via useContributions
   - Edit nominal Kas Kelas: ✅ tersimpan ke backend (PATCH /api/settings)

2. **Offline support** - Belum diimplementasikan
   - Aplikasi sekarang full online (memerlukan API)
   - PWA masih berfungsi untuk cache assets, tapi data requires API

3. **Error handling** - Basic
   - Loading states: ✅ ada
   - Error messages: ✅ tampil di UI
   - Retry mechanism: ✅ manual (reload button)
   - Automatic retry: ❌ belum ada

---

## Environment Variables

File `.env.local` (already exists):
```env
DATABASE_URL="postgresql://..."
```

Optional (default: /api):
```env
VITE_API_BASE_URL="/api"
```

---

## Next Steps (NOT DONE - Out of Scope FASE 2)

### Future (FASE 3+):
1. **Data migration** - Migrate localStorage → Neon
2. **Import dari Spreadsheet** - One-time migration tool
3. **React Query/SWR** - Better data fetching & caching
4. **Optimistic updates** - Update UI before API response
5. **Offline support** - Service worker + IndexedDB cache
6. **Authentication** - Multi-user support (jika diperlukan)

---

## Summary

✅ **FASE 2 COMPLETED**

Frontend sekarang **database-first melalui Neon API**:
- Semua CRUD operations → API → Neon PostgreSQL
- Amal Jumat & Paguyuban Ngaji terintegrasi penuh
- localStorage tidak lagi ditulis (legacy data preserved)
- Google Sheets tidak digunakan untuk write
- Build successful tanpa TypeScript errors
- Interface compatibility maintained (minimal UI changes)
- Loading & error states added
- CRUD diuji langsung terhadap API handler (18/18 PASS), 2 bug backend diperbaiki
- Data test dibersihkan dari Neon (students/contributions/finance = 0, settings = 3)

**Data Flow Confirmed**:
```
User Action → Frontend (React) → API Client → Vercel Functions → Neon PostgreSQL
```

**Database Constraints Enforced**:
- ✅ Nominal > 0
- ✅ Amal Jumat hanya Jumat
- ✅ Paguyuban Ngaji Rp12.000 + period
- ✅ Duplicate payment prevention
- ✅ FK RESTRICT (student must exist)

---

**FASE 2 SELESAI. Aplikasi siap untuk testing manual.**

---

## Deployment (LIVE)

Frontend + API sudah di-deploy ke Vercel dan berjalan di production.

| Item | Nilai |
|------|-------|
| Production URL | https://kaskelas-two.vercel.app |
| Project | pakchoyys-projects/kaskelas |
| Database | Neon PostgreSQL (floral-boat-83514478) |
| `DATABASE_URL` | di-set sebagai env var Production Vercel |

### Endpoint Live Terverifikasi
- `GET /api/settings` → 3 settings (kas_kelas=2000, amal_jumat=NULL, paguyuban=12000/fixed)
- `GET /api/students` → `[]` (bersih)
- `GET /api/dashboard` → metrics dengan saldo 0
- `GET /api/recap?contribution_type=kas_kelas` → perStudent kosong
- `POST /api/students` + `DELETE /api/students` → create & soft-delete OK (data test dibersihkan)

### Catatan Deploy
- Relative import di `api/*.ts` wajib pakai ekstensi `.js` (mis. `./db.js`) karena Vercel memakai `moduleResolution node16/nodenext` (error TS2835).
- Environment variable Vercel: `DATABASE_URL` (Sensitive, Production).
- Deploy command: `npx vercel link --yes --project kaskelas` lalu `npx vercel deploy --prod --yes`.
