import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from '../server/db.js';
import { sendSuccess, handleError, parseQueryParam } from '../server/utils.js';
import type { RecapData } from '../server/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const contributionType = parseQueryParam(req.query.contribution_type) || 'kas_kelas';
    const isGuruType = contributionType === 'tabungan_guru_bulanan' || contributionType === 'tabungan_guru_tw';
    const categoryFilter = isGuruType ? 'guru' : 'siswa';
    const scope = parseQueryParam(req.query.scope) || 'kaskelas';
    
    // Get all active students with their payment stats (filter by kategori + scope)
    const perStudent = await query<{
      id: string;
      name: string;
      paidDays: string;
      total: string;
      blok: string | null;
    }>(
      `SELECT 
        s.id,
        s.name,
        COALESCE(COUNT(c.id), 0)::text as "paidDays",
        COALESCE(SUM(c.nominal), 0)::text as total,
        s.blok
      FROM students s
      LEFT JOIN contributions c ON s.id = c.student_id 
        AND c.contribution_type = $1
      WHERE s.active = true AND s.category = $2 AND s.scope = $3
      GROUP BY s.id, s.name, s.blok
      ORDER BY s.name`,
      [contributionType, categoryFilter, scope]
    );
    
    // Add row numbers
    const perStudentWithNumbers = perStudent.map((student, index) => ({
      id: student.id,
      number: index + 1,
      name: student.name,
      paidDays: parseInt(student.paidDays, 10),
      total: parseInt(student.total, 10),
      blok: student.blok as 'etan' | 'kulon' | 'lainnya' | null,
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
       FROM finance_transactions WHERE category = $1 AND scope = $2`,
      [categoryFilter, scope]
    );
    const totalPemasukanLain = parseInt(financeTotals?.totalPemasukan || '0', 10);
    const totalPengeluaran = parseInt(financeTotals?.totalPengeluaran || '0', 10);

    const tabunganTotals = await queryOne<{
      totalMasuk: string | null;
      totalPenarikan: string | null;
    }>(
      `SELECT
        COALESCE(SUM(c.nominal) FILTER (WHERE c.nominal > 0), 0) as "totalMasuk",
        COALESCE(SUM(ABS(c.nominal)) FILTER (WHERE c.nominal < 0), 0) as "totalPenarikan"
       FROM contributions c JOIN students s ON s.id = c.student_id
       WHERE c.contribution_type = 'tabungan' AND s.scope = $1`,
      [scope]
    );
    const totalTabunganMasuk = parseInt(tabunganTotals?.totalMasuk || '0', 10);
    const totalTabunganPenarikan = parseInt(tabunganTotals?.totalPenarikan || '0', 10);
    
    const saldoKelas = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Get latest cash date
    const latestDateResult = await queryOne<{ date: string | null }>(
      `SELECT MAX(c.date)::text as date
       FROM contributions c JOIN students s ON s.id = c.student_id
       WHERE c.contribution_type = $1 AND s.scope = $2`,
      [contributionType, scope]
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
        WHERE s.active = true AND s.category = 'siswa' AND s.scope = $2
        GROUP BY s.id, s.name
        ORDER BY s.name`,
        [currentYear, scope]
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
