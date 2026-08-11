# API Documentation - Kas Kelas Backend

Backend API untuk aplikasi Kas Kelas menggunakan Vercel Serverless Functions dengan Neon PostgreSQL.

## Environment Variables

Tambahkan ke `.env.local`:

```env
DATABASE_URL="your-neon-database-url"
```

File `.env.local` sudah ada dan ter-gitignore.

## API Endpoints

Base URL: `/api`

### Students

**GET `/api/students`**
- Query params: `includeInactive=true` (optional)
- Response: `{ success: true, data: Student[] }`

**POST `/api/students`**
- Body: `{ name: string }`
- Response: `{ success: true, data: Student }`

**PATCH `/api/students?id={studentId}`**
- Body: `{ name: string }`
- Response: `{ success: true, data: Student }`

**DELETE `/api/students?id={studentId}`**
- Soft delete (sets active=false)
- Response: `{ success: true, data: Student }`

### Contributions

**GET `/api/contributions`**
- Query params:
  - `contribution_type`: kas_kelas | amal_jumat | paguyuban_ngaji
  - `student_id`: string
  - `date`: YYYY-MM-DD
  - `date_from`: YYYY-MM-DD
  - `date_to`: YYYY-MM-DD
  - `period_month`: 1-12
  - `period_year`: number
- Response: `{ success: true, data: Contribution[] }`

**POST `/api/contributions`**
- Body: `{ studentId, contributionType, date, nominal, periodMonth?, periodYear? }`
- Validations:
  - Kas Kelas: nominal > 0
  - Amal Jumat: date must be Friday, nominal > 0
  - Paguyuban Ngaji: periodMonth + periodYear required, nominal must be 12000
  - Duplicate payment rejected
- Response: `{ success: true, data: Contribution }`

**PATCH `/api/contributions?id={contributionId}`**
- Body: `{ nominal?, date? }`
- Same validations as POST
- Response: `{ success: true, data: Contribution }`

**DELETE `/api/contributions?id={contributionId}`**
- Hard delete
- Response: `{ success: true, data: Contribution }`

### Finance Transactions

**GET `/api/finance`**
- Query params:
  - `type`: pemasukan | pengeluaran
  - `date_from`: YYYY-MM-DD
  - `date_to`: YYYY-MM-DD
- Response: `{ success: true, data: FinanceTransaction[] }`

**POST `/api/finance`**
- Body: `{ type, date, nominal, note }`
- Validations: nominal > 0, note not empty
- Response: `{ success: true, data: FinanceTransaction }`

**PATCH `/api/finance?id={transactionId}`**
- Body: `{ type?, date?, nominal?, note? }`
- Response: `{ success: true, data: FinanceTransaction }`

**DELETE `/api/finance?id={transactionId}`**
- Hard delete
- Response: `{ success: true, data: FinanceTransaction }`

### Settings

**GET `/api/settings`**
- Response: `{ success: true, data: ContributionSetting[] }`
- Returns default nominal for each contribution type

### Dashboard

**GET `/api/dashboard`**
- Response: `{ success: true, data: DashboardMetrics }`
- Aggregated metrics:
  - totalStudents
  - totalKasMasuk
  - totalPemasukanLain
  - totalPengeluaran
  - saldo
  - recentTransactions (last 5)

### Recap

**GET `/api/recap`**
- Query params: `contribution_type` (default: kas_kelas)
- Response: `{ success: true, data: RecapData }`
- Per-student summary with totals

## Response Format

Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Error Handling

- 400: Validation error
- 404: Resource not found
- 405: Method not allowed
- 500: Internal server error

Constraint violations return user-friendly messages:
- Duplicate entry
- Foreign key violation
- Check constraint violation (Amal Jumat Friday, Paguyuban nominal, etc.)

## Database Constraints

All database constraints from schema are enforced:
- Nominal > 0
- Amal Jumat only on Fridays
- Paguyuban Ngaji: period required, nominal = 12000
- Unique constraints per contribution type
- Foreign key ON DELETE RESTRICT

## Testing

Run database connection test:
```bash
npx tsx test-api.ts
```

## TypeScript

Typecheck API code:
```bash
npx tsc --project tsconfig.api.json --noEmit
```

## Types

All TypeScript types available in `api/types.ts` for frontend integration.
