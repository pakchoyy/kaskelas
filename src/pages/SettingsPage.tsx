import { Download, Smartphone } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { useState } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { requestSync } from '../lib/sync';

type ConnectionState = 'idle' | 'testing' | 'success' | 'error';

export function SettingsPage() {
  const { settings, setSettings } = useAppSettings();
  const { canInstall, install } = usePwaInstall();
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');

  const handleTestConnection = async () => {
    const url = settings.webAppUrl.trim();

    if (!url) {
      setConnectionState('error');
      setConnectionMessage('Masukkan Web App URL terlebih dahulu.');
      return;
    }

    setConnectionState('testing');
    setConnectionMessage('');

    try {
      const target = new URL(url);
      target.searchParams.set('action', 'ping');

      const response = await fetch(target.toString(), { method: 'GET' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setConnectionState('success');
      setConnectionMessage('Terhubung ke Apps Script.');
    } catch {
      setConnectionState('error');
      setConnectionMessage('Gagal terhubung. Periksa URL atau koneksi internet.');
    }
  };

  const handleSaveSettings = () => {
    setSettings((current) => ({ ...current }));
    setConnectionState('success');
    setConnectionMessage('Pengaturan tersimpan.');
    requestSync();
  };

  return (
    <PageShell
      title="Pengaturan"
      description="URL Apps Script, nominal kas harian, nama kelas, dan tahun pelajaran diatur di sini."
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Web App URL</span>
              <input
                value={settings.webAppUrl}
                onChange={(event) =>
                  setSettings((current) => ({ ...current, webAppUrl: event.target.value }))
                }
                placeholder="https://script.google.com/macros/s/.../exec"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={connectionState === 'testing'}
                className="h-12 rounded-2xl border border-brand-200 bg-brand-50 text-sm font-semibold text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectionState === 'testing' ? 'Menguji Koneksi...' : 'Tes Koneksi'}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="h-12 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
              >
                Simpan
              </button>
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                connectionState === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : connectionState === 'error'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-slate-50 text-slate-600'
              }`}
            >
              {connectionMessage || 'Pengaturan tersimpan.'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Data pengaturan ini akan dipakai untuk sinkronisasi ke Google Apps Script.
        </div>

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
            <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Tombol install muncul otomatis dari browser, atau buka menu browser → “Pasang aplikasi” / “Add to Home Screen”.
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
