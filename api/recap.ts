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
    
    // Get all active students with their payment stats
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
      WHERE s.active = true
      GROUP BY s.id, s.name
      ORDER BY s.created_at`,
      [contributionType]
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
    
    const saldoKelas = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Get latest cash date
    const latestDateResult = await queryOne<{ date: string | null }>(
      `SELECT MAX(date)::text as date
       FROM contributions
       WHERE contribution_type = $1`,
      [contributionType]
    );
    const latestCashDate = latestDateResult?.date || null;
    
    const recap: RecapData = {
      perStudent: perStudentWithNumbers,
      totalKasMasuk,
      totalPemasukanLain,
      totalPengeluaran,
      saldoKelas,
      latestCashDate,
    };
    
    sendSuccess(res, recap);
  } catch (error) {
    handleError(res, error);
  }
}
