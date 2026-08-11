import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './db.js';
import { sendSuccess, handleError } from './utils.js';
import type { DashboardMetrics } from './types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    // Get total active students
    const studentCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM students WHERE active = true'
    );
    const totalStudents = parseInt(studentCount?.count || '0', 10);
    
    // Get total kas masuk (contributions)
    const kasResult = await queryOne<{ total: string | null }>(
      `SELECT SUM(nominal) as total 
       FROM contributions 
       WHERE contribution_type = 'kas_kelas'`
    );
    const totalKasMasuk = parseInt(kasResult?.total || '0', 10);
    
    // Get total pemasukan lain
    const pemasukanResult = await queryOne<{ total: string | null }>(
      `SELECT SUM(nominal) as total 
       FROM finance_transactions 
       WHERE type = 'pemasukan'`
    );
    const totalPemasukanLain = parseInt(pemasukanResult?.total || '0', 10);
    
    // Get total pengeluaran
    const pengeluaranResult = await queryOne<{ total: string | null }>(
      `SELECT SUM(nominal) as total 
       FROM finance_transactions 
       WHERE type = 'pengeluaran'`
    );
    const totalPengeluaran = parseInt(pengeluaranResult?.total || '0', 10);
    
    // Calculate saldo
    const saldo = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    
    // Get recent transactions (last 5)
    // Combine contributions and finance transactions
    const recentContributions = await query<{
      id: string;
      date: string;
      type: string;
      count: string;
      amount: string;
    }>(
      `SELECT 
        'contrib-' || date as id,
        date::text as date,
        'Kas' as type,
        COUNT(*)::text as count,
        SUM(nominal)::text as amount
      FROM contributions
      WHERE contribution_type = 'kas_kelas'
      GROUP BY date
      ORDER BY date DESC
      LIMIT 5`
    );
    
    const recentFinance = await query<{
      id: string;
      date: string;
      type: string;
      note: string;
      amount: string;
    }>(
      `SELECT 
        id,
        date::text as date,
        type,
        note,
        nominal::text as amount
      FROM finance_transactions
      ORDER BY date DESC, created_at DESC
      LIMIT 5`
    );
    
    // Merge and sort recent transactions
    const recentTransactions = [
      ...recentContributions.map(c => ({
        id: c.id,
        date: c.date,
        type: c.type,
        count: parseInt(c.count, 10),
        amount: parseInt(c.amount, 10),
      })),
      ...recentFinance.map(f => ({
        id: f.id,
        date: f.date,
        type: f.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
        note: f.note,
        amount: parseInt(f.amount, 10),
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    
    const metrics: DashboardMetrics = {
      totalStudents,
      totalKasMasuk,
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
