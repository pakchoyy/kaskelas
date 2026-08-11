# Database Setup Guide - Neon PostgreSQL

## 📋 Overview

Folder ini berisi SQL scripts untuk setup database PostgreSQL di Neon untuk aplikasi Kas Kelas.

## 📂 File Structure

```
database/
├── 001_create_schema.sql       # Main schema creation (ENUMs, tables, indexes, seed data)
├── 002_test_constraints.sql    # Constraint validation tests (auto-rollback)
├── 003_verify_schema.sql       # Verification queries
└── README.md                    # Dokumentasi ini
```

## 🚀 Cara Menjalankan Script

### Option 1: Melalui Neon Console (Web UI)

1. Login ke [Neon Console](https://console.neon.tech/)
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy-paste isi file `001_create_schema.sql`
5. Klik **Run** atau tekan `Ctrl+Enter`
6. Tunggu hingga selesai (akan muncul notice success)

### Option 2: Melalui psql Client

Jika Anda memiliki `psql` installed:

```bash
# 1. Get connection string dari Neon Console
# Format: postgresql://user:password@host/database?sslmode=require

# 2. Jalankan script
psql "postgresql://user:password@host/database?sslmode=require" -f database/001_create_schema.sql

# 3. (Optional) Jalankan test constraints
psql "postgresql://user:password@host/database?sslmode=require" -f database/002_test_constraints.sql

# 4. (Optional) Jalankan verification
psql "postgresql://user:password@host/database?sslmode=require" -f database/003_verify_schema.sql
```

### Option 3: Melalui Node.js (pg library)

```javascript
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  await client.connect();
  
  const sql = fs.readFileSync('database/001_create_schema.sql', 'utf8');
  await client.query(sql);
  
  console.log('✅ Schema created successfully!');
  await client.end();
}

runMigration().catch(console.error);
```

## 📝 Urutan Eksekusi

1. **001_create_schema.sql** (WAJIB)
   - Buat ENUMs
   - Buat tabel
   - Buat indexes
   - Buat constraints
   - Insert seed data

2. **002_test_constraints.sql** (OPTIONAL - Recommended)
   - Test insert data
   - Validasi constraints
   - Auto-rollback (tidak meninggalkan data test)

3. **003_verify_schema.sql** (OPTIONAL)
   - Lihat struktur database
   - Lihat constraints
   - Lihat indexes
   - Lihat seed data

## ✅ Expected Output

Setelah menjalankan `001_create_schema.sql`, Anda akan melihat:

```
NOTICE: ✅ Database schema created successfully!
NOTICE: 📋 Tables created: students, contributions, finance_transactions, contribution_settings
NOTICE: 🎯 ENUMs created: contribution_type, transaction_type
NOTICE: 🔒 Constraints and indexes applied
NOTICE: 🌱 Seed data inserted for contribution_settings
```

## 🗄️ Database Structure

### Tables

1. **students**
   - `id` (TEXT, PK)
   - `name` (TEXT)
   - `active` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

2. **contributions**
   - `id` (TEXT, PK)
   - `student_id` (TEXT, FK → students)
   - `contribution_type` (ENUM: kas_kelas, amal_jumat, paguyuban_ngaji)
   - `date` (DATE)
   - `nominal` (INTEGER)
   - `period_month` (INTEGER, nullable)
   - `period_year` (INTEGER, nullable)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

3. **finance_transactions**
   - `id` (TEXT, PK)
   - `type` (ENUM: pemasukan, pengeluaran)
   - `date` (DATE)
   - `nominal` (INTEGER)
   - `note` (TEXT)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

4. **contribution_settings**
   - `id` (SERIAL, PK)
   - `contribution_type` (ENUM, UNIQUE)
   - `default_nominal` (INTEGER, nullable)
   - `is_fixed` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

### ENUMs

- **contribution_type**: `kas_kelas`, `amal_jumat`, `paguyuban_ngaji`
- **transaction_type**: `pemasukan`, `pengeluaran`

### Key Constraints

1. **Foreign Key**: `contributions.student_id` → `students.id` (ON DELETE RESTRICT)
2. **Check Constraints**:
   - `nominal > 0` (semua transaksi)
   - Amal Jumat hanya hari Jumat
   - Paguyuban Ngaji harus nominal 12000 dan punya period
   - Finance note tidak boleh kosong
3. **Unique Indexes** (Partial):
   - Kas Kelas: 1 siswa max 1x bayar per tanggal
   - Amal Jumat: 1 siswa max 1x bayar per tanggal
   - Paguyuban Ngaji: 1 siswa max 1x bayar per periode bulan

### Seed Data (contribution_settings)

| contribution_type | default_nominal | is_fixed |
|-------------------|----------------|----------|
| kas_kelas         | 2000           | false    |
| amal_jumat        | NULL           | false    |
| paguyuban_ngaji   | 12000          | true     |

## 🧪 Testing Constraints

Jalankan `002_test_constraints.sql` untuk memvalidasi:

- ✅ Students dapat dibuat
- ✅ Kas Kelas dapat dibuat dengan nominal berbeda
- ✅ Amal Jumat hanya menerima hari Jumat
- ✅ Paguyuban Ngaji hanya menerima nominal 12000
- ✅ Duplicate payment ditolak
- ✅ Finance transactions dapat dibuat
- ✅ Foreign key RESTRICT berfungsi

## 🔍 Verification

Jalankan `003_verify_schema.sql` untuk melihat:

- Daftar tabel
- Struktur kolom per tabel
- Constraints
- Indexes
- Seed data

## ⚠️ Important Notes

- **JANGAN** jalankan script ini di production database yang sudah berisi data
- **JANGAN** menjalankan migration data lama pada tahap ini
- Script ini hanya membuat struktur database kosong
- Seed data hanya untuk `contribution_settings` (3 rows)
- Data production akan dimigrasikan pada tahap berikutnya

## 🔄 Rollback

Jika ingin menghapus semua tabel dan mulai dari awal:

```sql
DROP TABLE IF EXISTS contributions CASCADE;
DROP TABLE IF EXISTS finance_transactions CASCADE;
DROP TABLE IF EXISTS contribution_settings CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TYPE IF EXISTS contribution_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
```

Kemudian jalankan ulang `001_create_schema.sql`.

## 📞 Connection String

Dapatkan connection string dari Neon Console:

```
Dashboard → Project → Connection Details → Connection String
```

Format:
```
postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

## 🎯 Next Steps

Setelah database setup selesai:

1. ✅ Verifikasi struktur database
2. ✅ Test constraints
3. ⏳ Buat API/backend layer (Next phase)
4. ⏳ Migrasikan data dari Spreadsheet/localStorage (Next phase)
5. ⏳ Update frontend untuk connect ke API (Next phase)

## 📚 References

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL ENUM Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL Check Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS)
