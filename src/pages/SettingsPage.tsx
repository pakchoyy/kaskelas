import { Download, Smartphone, Shield, Mail } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { useState, useEffect } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';
import { useAppMode } from '../hooks/useAppMode';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { studentsApi, contributionsApi, financeApi } from '../services/api';

export function SettingsPage() {
  const { settings, setSettings, updateDailyCashNominal } = useAppSettings();
  const { canInstall, install } = usePwaInstall();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const handleSaveSettings = () => {
    updateDailyCashNominal(settings.dailyCashNominal);
    setSettings((current) => ({ ...current }));
  };

  const { mode } = useAppMode();
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');

  const handleBackupNow = async () => {
    try {
      setBackupLoading(true);
      setBackupMessage('');
      const [students, contributions, finance] = await Promise.all([
        studentsApi.getAll(true, mode as any),
        contributionsApi.getAll(),
        financeApi.getAll({ category: mode as any }),
      ]);
      const backup = {
        mode,
        exportedAt: new Date().toISOString(),
        className: settings.className,
        schoolYear: settings.schoolYear,
        students,
        contributions,
        finance,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${mode}-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMessage('Backup JSON berhasil diunduh.');
      // juga trigger backup API untuk kirim email jika ada email
      if (settings.backupEmail) {
        await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: settings.backupEmail, mode }) });
        setBackupMessage((m) => m + ' Email backup juga dikirim.');
      }
    } catch (err) {
      setBackupMessage('Gagal backup: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <PageShell
      title="Pengaturan"
      description="Nominal kas harian, nama kelas, dan tahun pelajaran diatur di sini."
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nominal Kas Harian</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={settings.dailyCashNominal}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    dailyCashNominal: Number(event.target.value) || 0,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nama Kelas</span>
              <input
                value={settings.className}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, className: event.target.value }))
                }
                placeholder="Contoh: 6A"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Tahun Pelajaran</span>
              <input
                value={settings.schoolYear}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, schoolYear: event.target.value }))
                }
                placeholder="Contoh: 2025/2026"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="h-12 w-full rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              Simpan
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><Shield className="h-5 w-5" strokeWidth={2} /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Backup Data ({mode === 'guru' ? 'Guru' : 'Siswa'})</p>
              <p className="text-xs text-slate-500">Simpan & kirim backup bulanan biar aman kalau data keserang.</p>
            </div>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email backup otomatis (opsional)</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={settings.backupEmail || ''} onChange={(e) => setSettings((c) => ({ ...c, backupEmail: e.target.value }))} placeholder="email@contoh.com" className="h-12 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
              </div>
              <button type="button" onClick={handleSaveSettings} className="h-12 shrink-0 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white">Simpan Email</button>
            </div>
            <p className="text-xs text-slate-400">Tiap awal bulan otomatis dikirim ke email ini (jika diisi).</p>
          </label>
          <button type="button" onClick={handleBackupNow} disabled={backupLoading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50">
            <Download className="h-5 w-5" strokeWidth={2} />{backupLoading ? 'Membuat backup...' : 'Backup Sekarang (Download JSON)'}
          </button>
          {backupMessage && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{backupMessage}</p>}
          <p className="mt-2 text-xs text-slate-400">File JSON berisi siswa/guru, iuran, dan keuangan sesuai mode {mode}.</p>
        </div>

        {canInstall || isStandalone ? (
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Smartphone className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Pasang sebagai aplikasi</p>
                <p className="text-xs text-slate-500">Buka cepat dari layar utama HP, bisa dipakai offline.</p>
              </div>
            </div>

            {canInstall ? (
              <button
                type="button"
                onClick={() => void install()}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
              >
                <Download className="h-5 w-5" strokeWidth={2} />
                Install Aplikasi
              </button>
            ) : (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
                Aplikasi sudah terpasang.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
