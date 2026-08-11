import { useMemo, useState } from 'react';
import { InfoCard } from '../components/InfoCard';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatCurrency } from '../lib/format';
import { formatShortDisplayDate } from '../lib/date';
import { ChevronDown } from 'lucide-react';

type ContributionFilter = 'semua' | 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji';

export function RecapPage() {
  const { students, cashRecords, financeRecords, refreshFromSpreadsheet } = useAppData();
  const { settings } = useAppSettings();
  const [refreshMessage, setRefreshMessage] = useState('');
  const [refreshState, setRefreshState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [filterOpen, setFilterOpen] = useState(false);
  const [contributionFilter, setContributionFilter] = useState<ContributionFilter>('semua');

  const recap = useMemo(() => {
    const dailyNominal = settings.dailyCashNominal || 1000;

    // Filter hanya untuk Kas Kelas saat ini karena backend belum mendukung jenis lain
    const filteredCashRecords = contributionFilter === 'semua' || contributionFilter === 'kas-kelas'
      ? cashRecords
      : {};

    const perStudent = students.map((student, index) => {
      const paidDays = Object.values(filteredCashRecords).filter((record) =>
        record.checkedStudentIds.includes(student.id),
      ).length;

      return {
        id: student.id,
        number: index + 1,
        name: student.name,
        paidDays,
        total: paidDays * dailyNominal,
      };
    });

    const totalKasMasuk = perStudent.reduce((sum, item) => sum + item.total, 0);
    const totalPemasukanLain = financeRecords
      .filter((transaction) => transaction.type === 'Pemasukan')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);
    const totalPengeluaran = financeRecords
      .filter((transaction) => transaction.type === 'Pengeluaran')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);

    const saldoKelas = totalKasMasuk + totalPemasukanLain - totalPengeluaran;
    const latestCashDate = Object.values(filteredCashRecords)
      .filter((record) => record.checkedStudentIds.length > 0)
      .sort((left, right) => right.date.localeCompare(left.date))[0]?.date;

    return {
      perStudent,
      totalKasMasuk,
      totalPemasukanLain,
      totalPengeluaran,
      saldoKelas,
      latestCashDate,
    };
  }, [cashRecords, financeRecords, settings.dailyCashNominal, students, contributionFilter]);

  return (
    <PageShell
      title="Rekap"
      description="Ringkasan saldo kelas dan tabel per siswa."
    >
      <div className="space-y-4">
        {/* Filter Jenis Iuran */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-soft"
          >
            {contributionFilter === 'semua' && 'Semua Iuran'}
            {contributionFilter === 'kas-kelas' && 'Kas Kelas'}
            {contributionFilter === 'amal-jumat' && 'Amal Jumat'}
            {contributionFilter === 'paguyuban-ngaji' && 'Paguyuban Ngaji'}
            <ChevronDown className="h-5 w-5 text-slate-500" strokeWidth={2} />
          </button>
          {filterOpen && (
            <div className="absolute top-full z-10 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setContributionFilter('semua');
                  setFilterOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm font-medium transition first:rounded-t-2xl ${
                  contributionFilter === 'semua'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Semua Iuran
              </button>
              <button
                type="button"
                onClick={() => {
                  setContributionFilter('kas-kelas');
                  setFilterOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm font-medium transition ${
                  contributionFilter === 'kas-kelas'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Kas Kelas
              </button>
              <button
                type="button"
                onClick={() => {
                  setContributionFilter('amal-jumat');
                  setFilterOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm font-medium transition ${
                  contributionFilter === 'amal-jumat'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Amal Jumat
              </button>
              <button
                type="button"
                onClick={() => {
                  setContributionFilter('paguyuban-ngaji');
                  setFilterOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm font-medium transition last:rounded-b-2xl ${
                  contributionFilter === 'paguyuban-ngaji'
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Paguyuban Ngaji
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Ringkasan Akhir</p>
            <p className="mt-1 truncate text-base font-semibold text-slate-900">{settings.className || 'Kas Kelas'}</p>
            <p className="truncate text-xs text-slate-500">
              {settings.schoolYear || 'Tahun pelajaran belum diisi'}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              setRefreshState('loading');
              setRefreshMessage('');

              const refreshed = await refreshFromSpreadsheet();

              if (refreshed) {
                setRefreshState('success');
                setRefreshMessage('Data berhasil di-refresh dari Spreadsheet.');
                return;
              }

              setRefreshState('error');
              setRefreshMessage('Refresh gagal. Periksa koneksi internet.');
            }}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
          >
            {refreshState === 'loading' ? 'Merefresh...' : 'Refresh'}
          </button>
        </div>

        {refreshMessage ? (
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              refreshState === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {refreshMessage}
          </div>
        ) : null}

        <InfoCard title="Saldo Kelas" value={formatCurrency(recap.saldoKelas)} tone="brand">
          <p className="text-sm text-slate-500">
            Terhitung dari kas harian, pemasukan lain, dan pengeluaran.
          </p>
        </InfoCard>

        <div className="space-y-3">
          <InfoCard title="Total Kas" value={formatCurrency(recap.totalKasMasuk)} />
          <InfoCard title="Pemasukan Lain" value={formatCurrency(recap.totalPemasukanLain)} />
          <InfoCard title="Pengeluaran" value={formatCurrency(recap.totalPengeluaran)} />
        </div>

        {recap.latestCashDate ? (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
            Update kas terakhir: {formatShortDisplayDate(recap.latestCashDate)}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {recap.perStudent.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada data siswa.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed divide-y divide-slate-100 text-left text-sm">
                <colgroup>
                  <col className="w-12" />
                  <col />
                  <col className="w-24" />
                  <col className="w-28" />
                </colgroup>
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">No</th>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Hari Bayar</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recap.perStudent.map((student) => (
                    <tr key={student.id}>
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
      </div>
    </PageShell>
  );
}
