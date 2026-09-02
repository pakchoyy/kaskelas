import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, handleError, parseQueryParam } from './utils.js';
import type { DashboardMetrics } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    const category = parseQueryParam(req.query.category) as 'siswa' | 'guru' | undefined;
    const cat = category === 'guru' ? 'guru' : 'siswa';
    
    // Single query with CTE to get all metrics at once (filter by kategori)
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
          (SELECT COUNT(*) FROM students WHERE active = true AND category = $1) as total_students,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type = 'kas_kelas' AND s.active = true AND s.category = $1) as total_kas,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type IN ('tabungan','tabungan_guru_bulanan','tabungan_guru_tw') AND s.active = true AND s.category = $1) as total_tabungan,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type = 'tabungan_guru_bulanan' AND s.active = true AND s.category = 'guru') as total_guru_bulanan,
          (SELECT COALESCE(SUM(c.nominal), 0) FROM contributions c JOIN students s ON s.id = c.student_id WHERE c.contribution_type = 'tabungan_guru_tw' AND s.active = true AND s.category = 'guru') as total_guru_tw,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pemasukan' AND category = $1) as total_pemasukan,
          (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions WHERE type = 'pengeluaran' AND category = $1) as total_pengeluaran
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
      [cat]
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
        WHERE c.contribution_type = 'kas_kelas' AND s.category = $1
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
        WHERE category = $1
        ORDER BY date DESC, created_at DESC
        LIMIT 5
      )
      ORDER BY date DESC
      LIMIT 5`,
      [cat]
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
