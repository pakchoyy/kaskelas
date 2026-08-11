import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, handleError } from './utils.js';
import type { DashboardMetrics } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    // Single query with CTE to get all metrics at once
    const metricsResult = await queryOne<{
      totalStudents: string;
      totalKasMasuk: string;
      totalTabungan: string;
      totalPemasukanLain: string;
      totalPengeluaran: string;
    }>(
      `WITH metrics AS (
        SELECT
          (SELECT COUNT(*) FROM students WHERE active = true) as total_students,
          (SELECT COALESCE(SUM(nominal), 0) FROM contributions WHERE contribution_type = 'kas_kelas') as total_kas,
          (SELECT COALESCE(SUM(nominal), 0) FROM contributions WHERE contribution_type::text = 'tabungan') as total_tabungan,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pemasukan') as total_pemasukan,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pengeluaran') as total_pengeluaran
      )
      SELECT 
        total_students::text as "totalStudents",
        total_kas::text as "totalKasMasuk",
        total_tabungan::text as "totalTabungan",
        total_pemasukan::text as "totalPemasukanLain",
        total_pengeluaran::text as "totalPengeluaran"
      FROM metrics`
    );
    
    const totalStudents = parseInt(metricsResult?.totalStudents || '0', 10);
    const totalKasMasuk = parseInt(metricsResult?.totalKasMasuk || '0', 10);
    const totalTabungan = parseInt(metricsResult?.totalTabungan || '0', 10);
    const totalPemasukanLain = parseInt(metricsResult?.totalPemasukanLain || '0', 10);
    const totalPengeluaran = parseInt(metricsResult?.totalPengeluaran || '0', 10);
    const saldo = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Single UNION query for recent transactions
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
          'contrib-' || date as id,
          date::text as date,
          'Kas' as type,
          COUNT(*)::text as count,
          NULL as note,
          SUM(nominal)::text as amount
        FROM contributions
        WHERE contribution_type = 'kas_kelas'
        GROUP BY date
        ORDER BY date DESC
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
        ORDER BY date DESC, created_at DESC
        LIMIT 5
      )
      ORDER BY date DESC
      LIMIT 5`
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
