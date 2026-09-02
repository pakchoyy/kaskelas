import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, handleError, parseQueryParam } from './utils.js';
import type { RecapData } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const contributionType = parseQueryParam(req.query.contribution_type) || 'kas_kelas';
    const isGuruType = contributionType === 'tabungan_guru_bulanan' || contributionType === 'tabungan_guru_tw';
    const categoryFilter = isGuruType ? 'guru' : 'siswa';
    
    // Get all active students with their payment stats (filter by kategori)
    const perStudent = await query<{
      id: string;
      name: string;
      paidDays: string;
      total: string;
    }>(
      `SELECT 
        s.id,
        s.name,
        COALESCE(COUNT(c.id), 0)::text as "paidDays",
        COALESCE(SUM(c.nominal), 0)::text as total
      FROM students s
      LEFT JOIN contributions c ON s.id = c.student_id 
        AND c.contribution_type = $1
      WHERE s.active = true AND s.category = $2
      GROUP BY s.id, s.name
      ORDER BY s.created_at`,
      [contributionType, categoryFilter]
    );
    
    // Add row numbers
    const perStudentWithNumbers = perStudent.map((student, index) => ({
      id: student.id,
      number: index + 1,
      name: student.name,
      paidDays: parseInt(student.paidDays, 10),
      total: parseInt(student.total, 10),
    }));
    
    // Calculate totals
    const totalKasMasuk = perStudentWithNumbers.reduce((sum, s) => sum + s.total, 0);
    
    const financeTotals = await queryOne<{
      totalPemasukan: string | null;
      totalPengeluaran: string | null;
    }>(
      `SELECT
        COALESCE(SUM(nominal) FILTER (WHERE type = 'pemasukan'), 0) as "totalPemasukan",
        COALESCE(SUM(nominal) FILTER (WHERE type = 'pengeluaran'), 0) as "totalPengeluaran"
       FROM finance_transactions`
    );
    const totalPemasukanLain = parseInt(financeTotals?.totalPemasukan || '0', 10);
    const totalPengeluaran = parseInt(financeTotals?.totalPengeluaran || '0', 10);

    const tabunganTotals = await queryOne<{
      totalMasuk: string | null;
      totalPenarikan: string | null;
    }>(
      `SELECT
        COALESCE(SUM(nominal) FILTER (WHERE nominal > 0), 0) as "totalMasuk",
        COALESCE(SUM(ABS(nominal)) FILTER (WHERE nominal < 0), 0) as "totalPenarikan"
       FROM contributions
       WHERE contribution_type = 'tabungan'`
    );
    const totalTabunganMasuk = parseInt(tabunganTotals?.totalMasuk || '0', 10);
    const totalTabunganPenarikan = parseInt(tabunganTotals?.totalPenarikan || '0', 10);
    
    const saldoKelas = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Get latest cash date
    const latestDateResult = await queryOne<{ date: string | null }>(
      `SELECT MAX(date)::text as date
       FROM contributions
       WHERE contribution_type = $1`,
      [contributionType]
    );
    const latestCashDate = latestDateResult?.date || null;

    // For Paguyuban Ngaji: list lunas months per student (current year)
    let paguyubanMonths: RecapData['paguyubanMonths'] = [];
    if (contributionType === 'paguyuban_ngaji') {
      const currentYear = new Date().getFullYear();
      const monthRows = await query<{
        id: string;
        name: string;
        months: string;
      }>(
        `SELECT 
          s.id,
          s.name,
          COALESCE(ARRAY_AGG(c.period_month ORDER BY c.period_month) FILTER (WHERE c.id IS NOT NULL), ARRAY[]::integer[])::text as months
        FROM students s
        LEFT JOIN contributions c ON s.id = c.student_id 
          AND c.contribution_type = 'paguyuban_ngaji'
          AND c.period_year = $1
        WHERE s.active = true AND s.category = 'siswa'
        GROUP BY s.id, s.name
        ORDER BY s.created_at`,
        [currentYear]
      );
      paguyubanMonths = monthRows.map((row) => ({
        id: row.id,
        name: row.name,
        months: (row.months ?? '{}')
          .replace(/^\{|\}$/g, '')
          .split(',')
          .filter((m) => m.trim() !== '')
          .map((m) => parseInt(m.trim(), 10)),
      }));
    }
    
    const recap: RecapData = {
      perStudent: perStudentWithNumbers,
      paguyubanMonths,
      totalKasMasuk,
      totalPemasukanLain,
      totalPengeluaran,
      totalTabunganMasuk,
      totalTabunganPenarikan,
      saldoKelas,
      latestCashDate,
    };
    
    sendSuccess(res, recap);
  } catch (error) {
    handleError(res, error);
  }
}
