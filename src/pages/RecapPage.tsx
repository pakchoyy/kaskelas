import { useMemo, useState, useEffect } from 'react';
import { InfoCard } from '../components/InfoCard';
import { PageShell } from '../components/PageShell';
import { formatCurrency } from '../lib/format';
import { ChevronDown } from 'lucide-react';
import { recapApi, type RecapData } from '../services/api';
import { mapContributionTypeToApi } from '../lib/apiHelpers';

const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatLunasRange(months: number[]): string {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return 'Belum lunas';
  }
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i];
    if (curr !== undefined && curr === prev + 1) {
      prev = curr;
      continue;
    }
    parts.push(start === prev ? monthShortNames[start - 1] : `${monthShortNames[start - 1]}-${monthShortNames[prev - 1]}`);
    start = curr ?? prev;
    prev = curr ?? prev;
  }
  return parts.join(', ');
}

type ContributionFilter = 'semua' | 'kas-kelas' | 'tabungan' | 'amal-jumat' | 'paguyuban-ngaji' | 'lks';

type KasView = 'per-siswa' | 'total-kas';

export function RecapPage() {
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [filterOpen, setFilterOpen] = useState(false);
  const [contributionFilter, setContributionFilter] = useState<ContributionFilter>('kas-kelas');
  const [kasView, setKasView] = useState<KasView>('per-siswa');
  const [kasViewOpen, setKasViewOpen] = useState(false);
  const [kasDetailOpen, setKasDetailOpen] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecap = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiType = mapContributionTypeToApi(contributionFilter === 'semua' ? 'kas-kelas' : contributionFilter);
        const data = await recapApi.getData(apiType);
        setRecap(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load recap';
        setError(message);
        console.error('Failed to load recap:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecap();
  }, [contributionFilter]);

  const handleRefresh = async () => {
    setRefreshState('loading');
    setRefreshMessage('');

    try {
      const apiType = mapContributionTypeToApi(contributionFilter === 'semua' ? 'kas-kelas' : contributionFilter);
      const data = await recapApi.getData(apiType);
      setRecap(data);
      setRefreshState('success');
      setRefreshMessage('Data berhasil dimuat');
      
      setTimeout(() => {
        setRefreshState('idle');
        setRefreshMessage('');
      }, 2000);
    } catch (err) {
      setRefreshState('error');
      setRefreshMessage(err instanceof Error ? err.message : 'Gagal memuat data');
    }
  };

  if (loading && !recap) {
    return (
      <PageShell title="Rekap" description="Rekap kas per siswa dan total kas kelas">
        <div className="flex items-center justify-center py-12">
          <p className="text-slate-500">Memuat data...</p>
        </div>
      </PageShell>
    );
  }

  if (error && !recap) {
    return (
      <PageShell title="Rekap" description="Rekap kas per siswa dan total kas kelas">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg"
          >
            Coba Lagi
          </button>
        </div>
      </PageShell>
    );
  }

  if (!recap) {
    return null;
  }

  return (
    <PageShell title="Rekap" description="Rekap kas per siswa dan total kas kelas">
      <div className="grid gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
<button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-900 shadow-soft"
          >
              <span>
                {contributionFilter === 'semua' && 'Semua Jenis'}
                {contributionFilter === 'kas-kelas' && 'Kas Kelas'}
                {contributionFilter === 'tabungan' && 'Tabungan'}
                {contributionFilter === 'amal-jumat' && 'Amal Jumat'}
                {contributionFilter === 'paguyuban-ngaji' && 'Paguyuban Ngaji'}
                {contributionFilter === 'lks' && 'LKS'}
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400" strokeWidth={2} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setContributionFilter('kas-kelas');
                    setFilterOpen(false);
                    setKasView('per-siswa');
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    contributionFilter === 'kas-kelas' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  Kas Kelas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContributionFilter('tabungan');
                    setFilterOpen(false);
                    setKasView('per-siswa');
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    contributionFilter === 'tabungan' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  Tabungan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContributionFilter('amal-jumat');
                    setFilterOpen(false);
                    setKasView('per-siswa');
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    contributionFilter === 'amal-jumat' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  Amal Jumat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContributionFilter('paguyuban-ngaji');
                    setFilterOpen(false);
                    setKasView('per-siswa');
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    contributionFilter === 'paguyuban-ngaji' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  Paguyuban Ngaji
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContributionFilter('lks');
                    setFilterOpen(false);
                    setKasView('per-siswa');
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm ${
                    contributionFilter === 'lks' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                  }`}
                >
                  LKS
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            className="flex h-11 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {refreshState === 'loading' ? 'Memuat...' : 'Muat Ulang'}
          </button>
        </div>

        {refreshMessage && (
          <div
            className={`rounded-xl p-3 text-sm ${
              refreshState === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : refreshState === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-slate-50 text-slate-800'
            }`}
          >
            {refreshMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <InfoCard title="Total Kas Masuk" value={formatCurrency(recap.totalKasMasuk)} />
          <InfoCard title="Saldo Kelas" value={formatCurrency(recap.saldoKelas)} tone="brand" />
          <InfoCard title="Pemasukan Lain" value={formatCurrency(recap.totalPemasukanLain)} />
          <InfoCard title="Pengeluaran" value={formatCurrency(recap.totalPengeluaran)} />
        </div>

        {contributionFilter === 'kas-kelas' && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setKasViewOpen(!kasViewOpen)}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-900 shadow-soft"
          >
            <span>
              {kasView === 'per-siswa' ? 'Kas Baru' : 'Kas Akhir Siswa'}
            </span>
            <ChevronDown className="h-5 w-5 text-slate-400" strokeWidth={2} />
          </button>

          {kasViewOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setKasView('per-siswa');
                  setKasViewOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm ${
                  kasView === 'per-siswa' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                }`}
              >
                Kas Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setKasView('total-kas');
                  setKasViewOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm ${
                  kasView === 'total-kas' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
                }`}
              >
                Kas Akhir Siswa
              </button>
            </div>
          )}
        </div>
        )}

        {kasView === 'total-kas' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Kas Akhir Siswa</h3>
              <button
                type="button"
                onClick={() => setKasDetailOpen(!kasDetailOpen)}
                className={`flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${
                  kasDetailOpen
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {kasDetailOpen ? 'DETAIL' : 'RINGKAS'}
              </button>
            </div>
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">No</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  {kasDetailOpen && (
                    <>
                      <th className="px-4 py-3 text-right font-medium">Kas Siswa</th>
                      <th className="px-4 py-3 text-right font-medium">+ Pemasukan</th>
                      <th className="px-4 py-3 text-right font-medium">− Pengeluaran</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const n = recap.perStudent.length;
                  const bagianPemasukan = n > 0 ? Math.round(recap.totalPemasukanLain / n) : 0;
                  const bagianPengeluaran = n > 0 ? Math.round(recap.totalPengeluaran / n) : 0;
                  const totalAkumulasi = bagianPemasukan - bagianPengeluaran;
                  return (
                    <>
                      {recap.perStudent.map((student, index) => {
                        const kasAkhir = student.total + totalAkumulasi;
                        return (
                          <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                            <td className="px-4 py-3 text-slate-500">{student.number}</td>
                            <td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td>
                            {kasDetailOpen && (
                              <>
                                <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(student.total)}</td>
                                <td className="px-4 py-3 text-right text-slate-600">+{formatCurrency(bagianPemasukan)}</td>
                                <td className="px-4 py-3 text-right text-slate-600">−{formatCurrency(bagianPengeluaran)}</td>
                              </>
                            )}
                            <td className="truncate px-4 py-3 text-right font-semibold text-brand-700">
                              {formatCurrency(kasAkhir)}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
              </tbody>
            </table>
            {recap.perStudent.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-500">Belum ada data siswa</p>
            )}
          </div>
        )}

        {contributionFilter === 'paguyuban-ngaji' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">Lunas Per Siswa</h3>
            </div>
            {recap.perStudent.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">Belum ada data siswa</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">No</th>
                      <th className="px-4 py-3 font-medium">Nama</th>
                      <th className="px-4 py-3 font-medium">Bulan Lunas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recap.perStudent.map((student, index) => {
                      const months = recap.paguyubanMonths.find((m) => m.id === student.id)?.months ?? [];
                      return (
                        <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                          <td className="px-4 py-3 text-slate-500">{student.number}</td>
                          <td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td>
                          <td className="px-4 py-3 font-semibold text-brand-700">{formatLunasRange(months)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {kasView === 'per-siswa' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-base font-semibold text-slate-900">Per Siswa</h3>
          </div>

          {recap.perStudent.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Belum ada data siswa</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">No</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Hari Bayar</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recap.perStudent.map((student, index) => (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                      <td className="px-4 py-3 text-slate-500">{student.number}</td>
                      <td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td>
                      <td className="px-4 py-3 text-slate-600">{student.paidDays}</td>
                      <td className="truncate px-4 py-3 font-semibold text-brand-700">{formatCurrency(student.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </PageShell>
  );
}
