import { useMemo } from 'react';
import { InfoCard } from '../components/InfoCard';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatCurrency } from '../lib/format';
import { formatShortDisplayDate } from '../lib/date';

export function DashboardPage() {
  const { students, cashRecords, financeRecords } = useAppData();
  const { settings } = useAppSettings();

  const metrics = useMemo(() => {
    const dailyNominal = settings.dailyCashNominal || 1000;
    const cashEntries = Object.values(cashRecords)
      .filter((record) => record.checkedStudentIds.length > 0)
      .sort((left, right) => right.date.localeCompare(left.date));

    const totalPaidEntries = cashEntries.reduce((sum, record) => sum + record.checkedStudentIds.length, 0);
    const totalKasMasuk = totalPaidEntries * dailyNominal;

    const totalPemasukanLain = financeRecords
      .filter((transaction) => transaction.type === 'Pemasukan')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);

    const totalPengeluaran = financeRecords
      .filter((transaction) => transaction.type === 'Pengeluaran')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);

    const recentCash = cashEntries.map((record) => ({
      id: `cash-${record.date}`,
      date: record.date,
      type: 'Kas' as const,
      count: record.checkedStudentIds.length,
      amount: record.checkedStudentIds.length * dailyNominal,
    }));

    const recentFinance = financeRecords.map((transaction) => ({
      id: transaction.id,
      date: transaction.date,
      type: transaction.type,
      note: transaction.note,
      amount: transaction.nominal,
    }));

    const recentTransactions = [...recentCash, ...recentFinance]
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 5);

    return {
      totalStudents: students.length,
      totalKasMasuk,
      totalPengeluaran,
      totalPemasukanLain,
      saldo: totalKasMasuk + totalPemasukanLain - totalPengeluaran,
      recentTransactions,
    };
  }, [cashRecords, financeRecords, settings.dailyCashNominal, students.length]);

  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan kas kelas, transaksi terbaru, dan shortcut utama ada di sini."
    >
      <div className="grid gap-3">
        <InfoCard title="Saldo Kelas" value={formatCurrency(metrics.saldo)} tone="brand">
            <p className="text-sm text-slate-500">
              {metrics.totalStudents > 0
                ? `Ringkasan dari ${metrics.totalStudents} siswa.`
                : 'Belum ada data siswa.'}
            </p>
        </InfoCard>

        <div className="grid grid-cols-2 gap-3">
          <InfoCard title="Total Masuk" value={formatCurrency(metrics.totalKasMasuk)} />
          <InfoCard title="Total Keluar" value={formatCurrency(metrics.totalPengeluaran)} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">5 Transaksi Terkini</p>
              <p className="mt-1 text-sm text-slate-500">5 transaksi terbaru dari kas dan keuangan.</p>
            </div>
          </div>

          {metrics.recentTransactions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Belum ada transaksi.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
              {metrics.recentTransactions.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {formatShortDisplayDate(item.date)}
                    </p>
                    <p className="text-xs text-slate-500">
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
                      {item.type === 'Kas' ? 'Kas masuk' : item.type === 'Pemasukan' ? 'Pemasukan lain' : 'Pengeluaran'}
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
