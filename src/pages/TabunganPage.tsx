import { useMemo, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { BottomSheet } from '../components/BottomSheet';
import { NominalStepper } from '../components/NominalStepper';
import { useAppData } from '../hooks/useAppData';
import { contributionsApi } from '../services/api';
import { formatCurrency } from '../lib/format';
import { todayIsoDate } from '../lib/date';

type TransactionMode = 'setor' | 'tarik';

export function TabunganPage() {
  const { students, contributions, reload } = useAppData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('setor');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [nominal, setNominal] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [saving, setSaving] = useState(false);

  // Calculate balance per student (sum of all tabungan contributions)
  const studentBalances = useMemo(() => {
    return students.map(student => {
      const total = contributions
        .filter(c => c.studentId === student.id && c.contributionType === 'tabungan')
        .reduce((sum, c) => sum + c.nominal, 0);
      
      return {
        student,
        balance: total,
      };
    });
  }, [students, contributions]);

  const totalBalance = useMemo(() => {
    return studentBalances.reduce((sum, item) => sum + item.balance, 0);
  }, [studentBalances]);

  const activeStudent = useMemo(
    () => students.find(s => s.id === activeStudentId),
    [activeStudentId, students],
  );

  const openSheet = (studentId: string, mode: TransactionMode) => {
    setActiveStudentId(studentId);
    setTransactionMode(mode);
    setNominal('');
    setDate(todayIsoDate());
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setActiveStudentId(null);
    setNominal('');
  };

  const handleSave = async () => {
    if (!activeStudentId || !nominal || Number(nominal) <= 0) {
      return;
    }

    setSaving(true);
    try {
      const amount = transactionMode === 'setor' ? Number(nominal) : -Number(nominal);
      
      await contributionsApi.create({
        studentId: activeStudentId,
        contributionType: 'tabungan',
        date,
        nominal: amount,
      });

      await reload();
      closeSheet();
    } catch (err) {
      console.error('Failed to save transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Tabungan" description="Kelola tabungan siswa">
      <div className="space-y-3">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total Tabungan Kelas</p>
          <p className="mt-1 text-2xl font-semibold text-brand-700">{formatCurrency(totalBalance)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {studentBalances.map(({ student, balance }, index) => (
                <li key={student.id} className={`flex items-center justify-between gap-3 px-4 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Saldo: {formatCurrency(balance)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openSheet(student.id, 'setor')}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Setor
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet(student.id, 'tarik')}
                      disabled={balance <= 0}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-30"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Tarik
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={transactionMode === 'setor' ? 'Setor Tabungan' : 'Tarik Tabungan'}
      >
        <div className="space-y-4">
          {activeStudent && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Siswa</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{activeStudent.name}</p>
            </div>
          )}

          <div>
            <label htmlFor="nominal" className="block text-sm font-medium text-slate-700">
              Nominal
            </label>
            <NominalStepper
              value={nominal}
              onChange={setNominal}
              inputClassName="w-full"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700">
              Tanggal
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayIsoDate()}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !nominal || Number(nominal) <= 0}
            className="h-12 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : transactionMode === 'setor' ? 'Setor' : 'Tarik'}
          </button>
        </div>
      </BottomSheet>
    </PageShell>
  );
}
