import { useState, useEffect } from 'react';
import { InfoCard } from '../components/InfoCard';
import { PageShell } from '../components/PageShell';
import { formatCurrency } from '../lib/format';
import { formatShortDisplayDate } from '../lib/date';
import { dashboardApi, type DashboardMetrics } from '../services/api';
import { useAppMode } from '../hooks/useAppMode';

export function DashboardPage() {
  const { mode, setMode } = useAppMode();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getMetrics();
        setMetrics(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(message);
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <PageShell
        title="Dashboard"
        description="Ringkasan kas kelas, transaksi terbaru, dan shortcut utama ada di sini."
      >
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Memuat data...</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell
        title="Dashboard"
        description="Ringkasan kas kelas, transaksi terbaru, dan shortcut utama ada di sini."
      >
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      </PageShell>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan kas kelas, transaksi terbaru, dan shortcut utama ada di sini."
    >
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setMode('siswa')} className={`rounded-2xl border p-4 text-left shadow-soft transition ${mode === 'siswa' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs font-semibold ${mode === 'siswa' ? 'text-brand-700' : 'text-slate-500'}`}>Siswa</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.totalStudents}</p>
            <p className="text-xs text-slate-500">orang</p>
          </button>
          <button type="button" onClick={() => setMode('guru')} className={`rounded-2xl border p-4 text-left shadow-soft transition ${mode === 'guru' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}>
            <p className={`text-xs font-semibold ${mode === 'guru' ? 'text-brand-700' : 'text-slate-500'}`}>Guru</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">9</p>
            <p className="text-xs text-slate-500">orang</p>
          </button>
        </div>

        <InfoCard title="Saldo Kas" value={formatCurrency(metrics.saldo)} tone="brand" />

        <div className="grid grid-cols-2 gap-3">
          <InfoCard title="Siswa Aktif" value={metrics.totalStudents.toString()} />
          <InfoCard title="Total Tabungan" value={formatCurrency(metrics.totalTabungan)} />
          <InfoCard title="Kas Masuk" value={formatCurrency(metrics.totalKasMasuk)} />
          <InfoCard title="Pemasukan Lain" value={formatCurrency(metrics.totalPemasukanLain)} />
          <InfoCard title="Pengeluaran" value={formatCurrency(metrics.totalPengeluaran)} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Transaksi Terakhir</h3>

          {metrics.recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Belum ada transaksi</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {metrics.recentTransactions.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {formatShortDisplayDate(item.date)}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.type === 'Kas'
                        ? `${item.count} siswa bayar`
                        : item.note}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        item.type === 'Pengeluaran' ? 'text-rose-700' : 'text-brand-700'
                      }`}
                    >
                      {item.type === 'Pengeluaran' ? '-' : '+'}{formatCurrency(item.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.type === 'Kas' ? 'Kas Kelas' : item.type === 'Pemasukan' ? 'Pemasukan lain' : 'Pengeluaran'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
