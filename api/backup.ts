import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../server/db.js';
import { sendSuccess, handleError, requireKey, isCronRequest } from '../server/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    // Cron Vercel dikenali dari CRON_SECRET; panggilan lain wajib kunci aplikasi.
    const isCron = isCronRequest(req);
    if (!isCron && !requireKey(req, res)) return;

    // Cron hanya boleh ke email yang diatur di server, bukan dari permintaan.
    const email = isCron ? process.env.BACKUP_EMAIL : ((req.body?.email as string) || process.env.BACKUP_EMAIL);
    const mode = (req.body?.mode as string) || (req.query.mode as string) || 'siswa';
    const scopeParam = (req.body?.scope as string) || (req.query.scope as string);
    const scope = scopeParam === 'kwaru' ? 'kwaru' : 'kaskelas';
    if (!email) return res.status(400).json({ success: false, error: 'Email required' });

    // Backup lengkap per kategori + scope (tanpa batas baris), termasuk catatan
    const cat = mode === 'guru' ? 'guru' : 'siswa';
    const students = await query(`SELECT id, name, category, active, blok FROM students WHERE category=$1 AND scope=$2 ORDER BY created_at`, [cat, scope]);
    const contributions = await query(`SELECT c.* FROM contributions c JOIN students s ON s.id=c.student_id WHERE s.category=$1 AND s.scope=$2 ORDER BY c.date DESC`, [cat, scope]);
    const finance = await query(`SELECT * FROM finance_transactions WHERE category=$1 AND scope=$2 ORDER BY date DESC`, [cat, scope]);
    const notes = await query(`SELECT * FROM notes ORDER BY created_at DESC`);

    const backup = { mode: cat, scope, exportedAt: new Date().toISOString(), students, contributions, finance, notes };

    let sent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const attachments = [{ filename: `backup-${scope}-${cat}-${new Date().toISOString().slice(0,10)}.json`, content: Buffer.from(JSON.stringify(backup, null, 2)).toString('base64') }];
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.BACKUP_FROM || 'Kas Kelas <noreply@kaskelas.my.id>',
            to: email,
            subject: `Backup Kas Kelas ${cat} - ${new Date().toISOString().slice(0,10)}`,
            text: `Backup otomatis ${cat} - ${new Date().toLocaleString('id-ID')}\nJumlah siswa/guru: ${students.length}\nJumlah iuran: ${contributions.length}\nJumlah transaksi keuangan: ${finance.length}\nJumlah catatan: ${notes.length}\n\nFile JSON terlampir.`,
            attachments,
          }),
        });
        sent = emailRes.ok;
        if (!emailRes.ok) console.error('Resend failed', await emailRes.text());
      } catch (e) {
        console.error('Resend failed', e);
      }
    }

    sendSuccess(res, { sent, count: { students: students.length, contributions: contributions.length, finance: finance.length, notes: notes.length } });
  } catch (error) {
    handleError(res, error);
  }
}
