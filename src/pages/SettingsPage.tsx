import { Download, Smartphone } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { useState, useEffect } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { requestSync } from '../lib/sync';

export function SettingsPage() {
  const { settings, setSettings } = useAppSettings();
  const { canInstall, install } = usePwaInstall();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const handleSaveSettings = () => {
    setSettings((current) => ({ ...current }));
    requestSync();
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
              Simpan & Sinkronkan
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Data otomatis sinkron ke Spreadsheet setiap 60 detik. Tidak perlu isi URL.
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
