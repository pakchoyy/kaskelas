import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from '../server/db.js';
import { sendSuccess, handleError, parseQueryParam } from '../server/utils.js';
import type { DashboardMetrics } from '../server/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const category = parseQueryParam(req.query.category) as 'siswa' | 'guru' | undefined;
    const cat = category === 'guru' ? 'guru' : 'siswa';
    const scope = parseQueryParam(req.query.scope) || 'kaskelas';

    if (scope === 'kwaru' && cat === 'siswa') {
      const currentYear = new Date().getFullYear();
      const currentTriwulan = Math.floor(new Date().getMonth() / 3) + 1;

      const metricsResult = await queryOne<{
        totalStudents: string;
        totalPisangisasi: string;
        totalTriwulan: string;
      }>(
        `WITH metrics AS (
          SELECT
            (SELECT COUNT(*) FROM students WHERE active = true AND category = 'siswa' AND scope = 'kwaru') as total_students,
            (SELECT COALESCE(SUM(c.nominal), 0)
             FROM contributions c
             JOIN students s ON s.id = c.student_id
             WHERE c.contribution_type = 'pisangisasi'
               AND c.date >= $1::date
               AND c.date <= $2::date
               AND s.active = true
               AND s.category = 'siswa'
               AND s.scope = 'kwaru') as total_pisangisasi,
            (SELECT COALESCE(SUM(c.nominal), 0)
             FROM contributions c
             JOIN students s ON s.id = c.student_id
             WHERE c.contribution_type = 'triwulan_jamaah'
               AND c.period_year = $3
               AND c.period_month = $4
               AND s.active = true
               AND s.category = 'siswa'
               AND s.scope = 'kwaru') as total_triwulan
        )
        SELECT
          total_students::text as "totalStudents",
          total_pisangisasi::text as "totalPisangisasi",
          total_triwulan::text as "totalTriwulan"
        FROM metrics`,
        [`${currentYear}-01-01`, `${currentYear}-12-31`, currentYear, currentTriwulan]
      );

      const totalStudents = parseInt(metricsResult?.totalStudents || '0', 10);
      const totalPisangisasi = parseInt(metricsResult?.totalPisangisasi || '0', 10);
      const totalTriwulan = parseInt(metricsResult?.totalTriwulan || '0', 10);
      const totalSodaqoh = totalPisangisasi + totalTriwulan;

      const recentTransactionsResult = await query<{
        id: string;
        date: string;
        type: string;
        count: string;
        amount: string;
      }>(
        `(
          SELECT
            'pisangisasi-' || c.date as id,
            c.date::text as date,
            'Pisangisasi' as type,
            COUNT(*)::text as count,
            SUM(c.nominal)::text as amount
          FROM contributions c
          JOIN students s ON s.id = c.student_id
          WHERE c.contribution_type = 'pisangisasi'
            AND s.category = 'siswa'
            AND s.scope = 'kwaru'
          GROUP BY c.date
          ORDER BY c.date DESC
          LIMIT 5
        )
        UNION ALL
        (
          SELECT
            'triwulan-' || c.period_year || '-' || c.period_month as id,
            MAKE_DATE(c.period_year, ((c.period_month - 1) * 3) + 1, 1)::text as date,
            'Triwulan' as type,
            COUNT(*)::text as count,
            SUM(c.nominal)::text as amount
          FROM contributions c
          JOIN students s ON s.id = c.student_id
          WHERE c.contribution_type = 'triwulan_jamaah'
            AND s.category = 'siswa'
            AND s.scope = 'kwaru'
          GROUP BY c.period_year, c.period_month
          ORDER BY c.period_year DESC, c.period_month DESC
          LIMIT 5
        )
        ORDER BY date DESC
        LIMIT 5`
      );

      return sendSuccess(res, {
        totalStudents,
        totalKasMasuk: totalSodaqoh,
        totalTabungan: totalPisangisasi,
        totalTabunganGuruBulanan: 0,
        totalTabunganGuruTw: 0,
        totalPemasukanLain: totalTriwulan,
        totalPengeluaran: 0,
        saldo: totalSodaqoh,
        recentTransactions: recentTransactionsResult.map(row => ({
          id: row.id,
          date: row.date,
          type: row.type,
          count: parseInt(row.count, 10),
          amount: parseInt(row.amount, 10),
        })),
      });
    }
    
    // Single query with CTE to get all metrics at once (filter by kategori + scope)
    const metricsResult = await queryOne<{
      totalStudents: string;
      totalKasMasuk: string;
      totalTabungan: string;
      totalGuruBulanan: string;
      totalGuruTw: string;
      totalPemasukanLain: string;
      totalPengeluaran: string;
    }>(
      `WITH metrics AS (
        SELECT
          (SELECT COUNT(*) FROM students WHERE active = true AND category = $1 AND scope = $2) as total_students,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type IN ('kas_kelas','pisangisasi') AND s.active = true AND s.category = $1 AND s.scope = $2) as total_kas,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type IN ('tabungan','tabungan_guru_bulanan','tabungan_guru_tw') AND s.active = true AND s.category = $1 AND s.scope = $2) as total_tabungan,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type = 'tabungan_guru_bulanan' AND s.active = true AND s.category = 'guru' AND s.scope = $2) as total_guru_bulanan,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type = 'tabungan_guru_tw' AND s.active = true AND s.category = 'guru' AND s.scope = $2) as total_guru_tw,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pemasukan' AND category = $1 AND scope = $2) as total_pemasukan,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pengeluaran' AND category = $1 AND scope = $2) as total_pengeluaran
       )
       SELECT 
        total_students::text as "totalStudents",
        total_kas::text as "totalKasMasuk",
        total_tabungan::text as "totalTabungan",
        total_guru_bulanan::text as "totalGuruBulanan",
        total_guru_tw::text as "totalGuruTw",
        total_pemasukan::text as "totalPemasukanLain",
        total_pengeluaran::text as "totalPengeluaran"
       FROM metrics`,
      [cat, scope]
    );
    
    const totalStudents = parseInt(metricsResult?.totalStudents || '0', 10);
    const totalKasMasuk = parseInt(metricsResult?.totalKasMasuk || '0', 10);
    const totalTabungan = parseInt(metricsResult?.totalTabungan || '0', 10);
    const totalTabunganGuruBulanan = parseInt((metricsResult as any)?.totalGuruBulanan || '0', 10);
    const totalTabunganGuruTw = parseInt((metricsResult as any)?.totalGuruTw || '0', 10);
    const totalPemasukanLain = parseInt(metricsResult?.totalPemasukanLain || '0', 10);
    const totalPengeluaran = parseInt(metricsResult?.totalPengeluaran || '0', 10);
    const saldo = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Single UNION query for recent transactions (filter by kategori)
    const recentTransactionsResult = await query<{
      id: string;
      date: string;
      type: string;
      count: string | null;
      note: string | null;
      amount: string;
    }>(
      `(
        SELECT 
          'contrib-' || c.date as id,
          c.date::text as date,
          'Kas' as type,
          COUNT(*)::text as count,
          NULL as note,
          SUM(c.nominal)::text as amount
        FROM contributions c JOIN students s ON s.id = c.student_id
        WHERE c.contribution_type IN ('kas_kelas','pisangisasi') AND s.category = $1 AND s.scope = $2
        GROUP BY c.date
        ORDER BY c.date DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          id,
          date::text as date,
          type::text as type,
          NULL as count,
          note,
          nominal::text as amount
        FROM finance_transactions
        WHERE category = $1 AND scope = $2
        ORDER BY date DESC, created_at DESC
        LIMIT 5
      )
      ORDER BY date DESC
      LIMIT 5`,
      [cat, scope]
    );
    
    const recentTransactions = recentTransactionsResult.map(row => ({
      id: row.id,
      date: row.date,
      type: row.type === 'Kas' ? 'Kas' : row.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      ...(row.count ? { count: parseInt(row.count, 10) } : { note: row.note || '' }),
      amount: parseInt(row.amount, 10),
    }));
    
    const metrics: DashboardMetrics = {
      totalStudents,
      totalKasMasuk,
      totalTabungan,
      totalTabunganGuruBulanan,
      totalTabunganGuruTw,
      totalPemasukanLain,
      totalPengeluaran,
      saldo,
      recentTransactions,
    };
    
    sendSuccess(res, metrics);
  } catch (error) {
    handleError(res, error);
  }
}
