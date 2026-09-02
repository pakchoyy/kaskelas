import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './db.js';
import { sendSuccess, handleError } from './utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const isCron = req.headers['x-vercel-cron'] === '1' || req.query.cron === '1';
    const email = (req.body?.email as string) || (req.query.email as string) || process.env.BACKUP_EMAIL;
    const mode = (req.body?.mode as string) || (req.query.mode as string) || 'siswa';
    if (!email && !isCron) return res.status(400).json({ success: false, error: 'Email required' });

    // Fetch data for backup (filter by mode)
    const cat = mode === 'guru' ? 'guru' : 'siswa';
    const students = await query(`SELECT id, name, category FROM students WHERE active=true AND category=$1 ORDER BY created_at`, [cat]);
    const contributions = await query(`SELECT c.* FROM contributions c JOIN students s ON s.id=c.student_id WHERE s.category=$1 ORDER BY c.date DESC LIMIT 1000`, [cat]);
    const finance = await query(`SELECT * FROM finance_transactions WHERE category=$1 ORDER BY date DESC LIMIT 500`, [cat]);

    const backup = { mode: cat, exportedAt: new Date().toISOString(), students, contributions, finance };

    // If Resend configured, send email via fetch (no package needed)
    if (process.env.RESEND_API_KEY && email) {
      try {
        const attachments = [{ filename: `backup-${cat}-${new Date().toISOString().slice(0,10)}.json`, content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64') }];
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.BACKUP_FROM || 'Kas Kelas <noreply@kaskelas.my.id>',
            to: email,
            subject: `Backup Kas Kelas ${cat} - ${new Date().toISOString().slice(0,10)}`,
            text: `Backup otomatis ${cat} - ${new Date().toLocaleString('id-ID')}\nJumlah siswa/guru: ${students.length}\nJumlah iuran: ${contributions.length}\nJumlah transaksi keuangan: ${finance.length}\n\nFile JSON terlampir.`,
            attachments,
          }),
        });
        if (!emailRes.ok) console.error('Resend failed', await emailRes.text());
      } catch (e) {
        console.error('Resend failed', e);
      }
    }

    sendSuccess(res, { sentTo: email || 'cron', count: { students: students.length, contributions: contributions.length, finance: finance.length } });
  } catch (error) {
    handleError(res, error);
  }
}
