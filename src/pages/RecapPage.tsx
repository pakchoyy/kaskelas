import { useMemo, useState, useEffect } from 'react';
import { InfoCard } from '../components/InfoCard';
import { PageShell } from '../components/PageShell';
import { formatCurrency } from '../lib/format';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { recapApi, contributionsApi, type RecapData } from '../services/api';
import { mapContributionTypeToApi } from '../lib/apiHelpers';
import { useAppMode } from '../hooks/useAppMode';

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

type ContributionFilter = 'semua' | 'kas-kelas' | 'tabungan' | 'amal-jumat' | 'paguyuban-ngaji' | 'lks' | 'tabungan-guru-bulanan' | 'tabungan-guru-tw';

type KasView = 'per-siswa' | 'total-kas';

export function RecapPage() {
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [filterOpen, setFilterOpen] = useState(false);
  const [contributionFilter, setContributionFilter] = useState<ContributionFilter>('kas-kelas');
  const { mode } = useAppMode();
  const [kasView, setKasView] = useState<KasView>('per-siswa');
  const [kasViewOpen, setKasViewOpen] = useState(false);
  const [kasDetailOpen, setKasDetailOpen] = useState(false);
  const [kasBaruView, setKasBaruView] = useState<'total' | 'bulanan'>('total');
  const [kasBaruMonth, setKasBaruMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [kasBaruBulanan, setKasBaruBulanan] = useState<Array<{ id: string; name: string; paidDays: number; total: number }>>([]);
  const [kasBaruBulananLoading, setKasBaruBulananLoading] = useState(false);
  const [tabunganView, setTabunganView] = useState<'total' | 'bulanan'>('total');
  const [tabunganMonth, setTabunganMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [tabunganBulanan, setTabunganBulanan] = useState<Array<{ id: string; name: string; masuk: number; tarik: number; total: number }>>([]);
  const [tabunganBulananLoading, setTabunganBulananLoading] = useState(false);
  const [guruRecapView, setGuruRecapView] = useState<'total' | 'bulanan'>('total');
  const [guruRecapMonth, setGuruRecapMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [guruRecapBulanan, setGuruRecapBulanan] = useState<Array<{ id: string; name: string; total: number }>>([]);
  const [guruRecapBulananLoading, setGuruRecapBulananLoading] = useState(false);
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

  useEffect(() => {
    if (mode === 'guru') setContributionFilter('tabungan-guru-bulanan');
    else setContributionFilter('kas-kelas');
  }, [mode]);

  // Tabungan per bulan
  useEffect(() => {
    if (contributionFilter !== 'tabungan' || tabunganView !== 'bulanan' || !recap) return;
    const loadBulanan = async () => {
      try {
        setTabunganBulananLoading(true);
        const from = `${tabunganMonth.year}-${String(tabunganMonth.month).padStart(2, '0')}-01`;
        const lastDay = new Date(tabunganMonth.year, tabunganMonth.month, 0).getDate();
        const to = `${tabunganMonth.year}-${String(tabunganMonth.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const data = await contributionsApi.getAll({ contributionType: 'tabungan', dateFrom: from, dateTo: to });
        const map = new Map<string, { masuk: number; tarik: number }>();
        data.forEach((c) => {
          const cur = map.get(c.studentId) || { masuk: 0, tarik: 0 };
          if (c.nominal > 0) cur.masuk += c.nominal;
          else cur.tarik += Math.abs(c.nominal);
          map.set(c.studentId, cur);
        });
        const rows = recap.perStudent.map((s) => {
          const v = map.get(s.id) || { masuk: 0, tarik: 0 };
          return { id: s.id, name: s.name, masuk: v.masuk, tarik: v.tarik, total: v.masuk - v.tarik };
        });
        setTabunganBulanan(rows);
      } catch (err) {
        console.error('Failed to load tabungan bulanan:', err);
      } finally {
        setTabunganBulananLoading(false);
      }
    };
    loadBulanan();
  }, [contributionFilter, tabunganView, tabunganMonth, recap]);

  // Kas Baru per bulan
  useEffect(() => {
    if (contributionFilter !== 'kas-kelas' || kasView !== 'per-siswa' || kasBaruView !== 'bulanan' || !recap) return;
    const loadKasBulanan = async () => {
      try {
        setKasBaruBulananLoading(true);
        const from = `${kasBaruMonth.year}-${String(kasBaruMonth.month).padStart(2, '0')}-01`;
        const lastDay = new Date(kasBaruMonth.year, kasBaruMonth.month, 0).getDate();
        const to = `${kasBaruMonth.year}-${String(kasBaruMonth.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const data = await contributionsApi.getAll({ contributionType: 'kas_kelas', dateFrom: from, dateTo: to });
        const map = new Map<string, { count: number; total: number }>();
        data.forEach((c) => {
          const cur = map.get(c.studentId) || { count: 0, total: 0 };
          cur.count += 1;
          cur.total += c.nominal;
          map.set(c.studentId, cur);
        });
        const rows = recap.perStudent.map((s) => {
          const v = map.get(s.id) || { count: 0, total: 0 };
          return { id: s.id, name: s.name, paidDays: v.count, total: v.total };
        });
        setKasBaruBulanan(rows);
      } catch (err) {
        console.error('Failed to load kas bulanan:', err);
      } finally {
        setKasBaruBulananLoading(false);
      }
    };
    loadKasBulanan();
  }, [contributionFilter, kasView, kasBaruView, kasBaruMonth, recap]);

  // Guru rekap per bulan
  useEffect(() => {
    if (mode !== 'guru' || guruRecapView !== 'bulanan' || !recap) return;
    const loadGuruBulanan = async () => {
      try {
        setGuruRecapBulananLoading(true);
        const from = `${guruRecapMonth.year}-${String(guruRecapMonth.month).padStart(2, '0')}-01`;
        const lastDay = new Date(guruRecapMonth.year, guruRecapMonth.month, 0).getDate();
        const to = `${guruRecapMonth.year}-${String(guruRecapMonth.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        const apiType = mapContributionTypeToApi(contributionFilter);
        const data = await contributionsApi.getAll({ contributionType: apiType as any, dateFrom: from, dateTo: to });
        const map = new Map<string, number>();
        data.forEach((c) => map.set(c.studentId, (map.get(c.studentId) || 0) + c.nominal));
        const rows = recap.perStudent.map((s) => ({ id: s.id, name: s.name, total: map.get(s.id) || 0 }));
        setGuruRecapBulanan(rows);
      } catch (err) {
        console.error('Failed to load guru bulanan:', err);
      } finally {
        setGuruRecapBulananLoading(false);
      }
    };
    loadGuruBulanan();
  }, [mode, guruRecapView, guruRecapMonth, recap, contributionFilter]);

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
                {contributionFilter === 'tabungan-guru-bulanan' && 'Tabungan Bulanan'}
                {contributionFilter === 'tabungan-guru-tw' && 'Tabungan TW'}
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400" strokeWidth={2} />
            </button>

            {filterOpen && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {mode === 'guru' ? (
                  <>
                    <button type="button" onClick={() => { setContributionFilter('tabungan-guru-bulanan'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'tabungan-guru-bulanan' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Tabungan Bulanan</button>
                    <button type="button" onClick={() => { setContributionFilter('tabungan-guru-tw'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'tabungan-guru-tw' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Tabungan TW</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setContributionFilter('kas-kelas'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'kas-kelas' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Kas Kelas</button>
                    <button type="button" onClick={() => { setContributionFilter('tabungan'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'tabungan' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Tabungan</button>
                    <button type="button" onClick={() => { setContributionFilter('amal-jumat'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'amal-jumat' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Amal Jumat</button>
                    <button type="button" onClick={() => { setContributionFilter('paguyuban-ngaji'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'paguyuban-ngaji' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>Paguyuban Ngaji</button>
                    <button type="button" onClick={() => { setContributionFilter('lks'); setFilterOpen(false); setKasView('per-siswa'); }} className={`block w-full px-4 py-3 text-left text-sm ${contributionFilter === 'lks' ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}>LKS</button>
                  </>
                )}
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

        {contributionFilter === 'tabungan' ? (
          <div className="grid grid-cols-2 gap-3">
            <InfoCard title="Total Tabungan Masuk" value={formatCurrency(recap.totalTabunganMasuk)} />
            <InfoCard title="Total Penarikan Tabungan" value={formatCurrency(recap.totalTabunganPenarikan)} />
            <div className="col-span-2">
              <InfoCard title="Saldo Tabungan Terkini" value={formatCurrency(recap.totalTabunganMasuk - recap.totalTabunganPenarikan)} tone="brand" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <InfoCard title="Total Kas Masuk" value={formatCurrency(recap.totalKasMasuk)} />
            <InfoCard title="Saldo Kelas" value={formatCurrency(recap.saldoKelas)} tone="brand" />
            <InfoCard title="Pemasukan Lain" value={formatCurrency(recap.totalPemasukanLain)} />
            <InfoCard title="Pengeluaran" value={formatCurrency(recap.totalPengeluaran)} />
          </div>
        )}

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

        {contributionFilter === 'tabungan' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTabunganView('total')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tabunganView === 'total' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
              >
                Total Tabungan
              </button>
              <button
                type="button"
                onClick={() => setTabunganView('bulanan')}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tabunganView === 'bulanan' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
              >
                Tabungan Per Bulan
              </button>
            </div>

            {tabunganView === 'total' ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h3 className="text-base font-semibold text-slate-900">Per Siswa — Total</h3>
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
                          <th className="px-4 py-3 text-right font-medium">Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recap.perStudent.map((student, index) => (
                          <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                            <td className="px-4 py-3 text-slate-500">{student.number}</td>
                            <td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td>
                            <td className="truncate px-4 py-3 text-right font-semibold text-brand-700">{formatCurrency(student.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
                  <button type="button" onClick={() => setTabunganMonth((m) => m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronLeft className="h-5 w-5" /></button>
                  <p className="text-sm font-semibold text-slate-900">{monthShortNames[tabunganMonth.month - 1]} {tabunganMonth.year}</p>
                  <button type="button" onClick={() => setTabunganMonth((m) => m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronRight className="h-5 w-5" /></button>
                </div>
                {tabunganBulananLoading ? (
                  <p className="py-12 text-center text-sm text-slate-500">Memuat...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">No</th>
                          <th className="px-4 py-3 font-medium">Nama</th>
                          <th className="px-4 py-3 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tabunganBulanan.map((row, index) => (
                          <tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}>
                            <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                            <td className="truncate px-4 py-3 font-medium text-slate-900">{row.name}</td>
                            <td className="px-4 py-3 text-right font-semibold text-brand-700">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {kasView === 'per-siswa' && contributionFilter !== 'tabungan' && contributionFilter !== 'paguyuban-ngaji' && (
          mode === 'guru' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setGuruRecapView('total')} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${guruRecapView === 'total' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Total</button>
                <button type="button" onClick={() => setGuruRecapView('bulanan')} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${guruRecapView === 'bulanan' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Per Bulan</button>
              </div>
              {guruRecapView === 'total' ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-base font-semibold text-slate-900">Per Guru — Total</h3></div>
                  {recap.perStudent.length === 0 ? (<p className="py-12 text-center text-sm text-slate-500">Belum ada data guru</p>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">No</th><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 text-right font-medium">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{recap.perStudent.map((student, index) => (<tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}><td className="px-4 py-3 text-slate-500">{student.number}</td><td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td><td className="truncate px-4 py-3 text-right font-semibold text-brand-700">{formatCurrency(student.total)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
                    <button type="button" onClick={() => setGuruRecapMonth((m) => m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronLeft className="h-5 w-5" /></button>
                    <p className="text-sm font-semibold text-slate-900">{monthShortNames[guruRecapMonth.month - 1]} {guruRecapMonth.year}</p>
                    <button type="button" onClick={() => setGuruRecapMonth((m) => m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronRight className="h-5 w-5" /></button>
                  </div>
                  {guruRecapBulananLoading ? (<p className="py-12 text-center text-sm text-slate-500">Memuat...</p>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">No</th><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 text-right font-medium">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{guruRecapBulanan.map((row, index) => (<tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}><td className="px-4 py-3 text-slate-500">{index + 1}</td><td className="truncate px-4 py-3 font-medium text-slate-900">{row.name}</td><td className="truncate px-4 py-3 text-right font-semibold text-brand-700">{formatCurrency(row.total)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : contributionFilter === 'kas-kelas' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setKasBaruView('total')} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${kasBaruView === 'total' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Total Kas</button>
                <button type="button" onClick={() => setKasBaruView('bulanan')} className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition ${kasBaruView === 'bulanan' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>Kas Per Bulan</button>
              </div>
              {kasBaruView === 'total' ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                  <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-base font-semibold text-slate-900">Per Siswa — Total</h3></div>
                  {recap.perStudent.length === 0 ? (<p className="py-12 text-center text-sm text-slate-500">Belum ada data siswa</p>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">No</th><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 font-medium">Hari Bayar</th><th className="px-4 py-3 font-medium">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{recap.perStudent.map((student, index) => (<tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}><td className="px-4 py-3 text-slate-500">{student.number}</td><td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td><td className="px-4 py-3 text-slate-600">{student.paidDays}</td><td className="truncate px-4 py-3 font-semibold text-brand-700">{formatCurrency(student.total)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3">
                    <button type="button" onClick={() => setKasBaruMonth((m) => m.month === 1 ? { year: m.year - 1, month: 12 } : { year: m.year, month: m.month - 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronLeft className="h-5 w-5" /></button>
                    <p className="text-sm font-semibold text-slate-900">{monthShortNames[kasBaruMonth.month - 1]} {kasBaruMonth.year}</p>
                    <button type="button" onClick={() => setKasBaruMonth((m) => m.month === 12 ? { year: m.year + 1, month: 1 } : { year: m.year, month: m.month + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ChevronRight className="h-5 w-5" /></button>
                  </div>
                  {kasBaruBulananLoading ? (<p className="py-12 text-center text-sm text-slate-500">Memuat...</p>) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">No</th><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 font-medium">Hari Bayar</th><th className="px-4 py-3 font-medium">Total</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">{kasBaruBulanan.map((row, index) => (<tr key={row.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}><td className="px-4 py-3 text-slate-500">{index + 1}</td><td className="truncate px-4 py-3 font-medium text-slate-900">{row.name}</td><td className="px-4 py-3 text-slate-600">{row.paidDays}</td><td className="truncate px-4 py-3 font-semibold text-brand-700">{formatCurrency(row.total)}</td></tr>))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="border-b border-slate-100 px-4 py-3"><h3 className="text-base font-semibold text-slate-900">Per Siswa</h3></div>
              {recap.perStudent.length === 0 ? (<p className="py-12 text-center text-sm text-slate-500">Belum ada data siswa</p>) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-medium">No</th><th className="px-4 py-3 font-medium">Nama</th><th className="px-4 py-3 font-medium">Hari Bayar</th><th className="px-4 py-3 font-medium">Total</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{recap.perStudent.map((student, index) => (<tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}><td className="px-4 py-3 text-slate-500">{student.number}</td><td className="truncate px-4 py-3 font-medium text-slate-900">{student.name}</td><td className="px-4 py-3 text-slate-600">{student.paidDays}</td><td className="truncate px-4 py-3 font-semibold text-brand-700">{formatCurrency(student.total)}</td></tr>))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </PageShell>
  );
}
