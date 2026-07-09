import { useMemo, useState } from 'react';
import { BottomSheet } from '../components/BottomSheet';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatCurrency } from '../lib/format';
import {
  formatDisplayDate,
  formatShortDisplayDate,
  formatWeekday,
  getMinCashDate,
  isCashDay,
  isDateAfter,
  shiftIsoDate,
  todayIsoDate,
} from '../lib/date';

export function CashPage() {
  const { students, cashRecords, setCheckedStudents } = useAppData();
  const { settings } = useAppSettings();
  const [activeDate, setActiveDate] = useState(todayIsoDate());
  const [sheetOpen, setSheetOpen] = useState(false);

  const minDate = getMinCashDate();
  const maxDate = todayIsoDate();
  const activeRecord = cashRecords[activeDate];
  const checkedStudentIds = activeRecord?.checkedStudentIds ?? [];

  const checkedCount = checkedStudentIds.length;
  const totalCount = students.length;
  const cashWarning = !isCashDay(activeDate);

  const checkedStudentNameList = useMemo(() => {
    return students.filter((student) => checkedStudentIds.includes(student.id)).map((student) => student.name);
  }, [checkedStudentIds, students]);

  const handleToggle = (studentId: string) => {
    const nextCheckedIds = checkedStudentIds.includes(studentId)
      ? checkedStudentIds.filter((id) => id !== studentId)
      : [...checkedStudentIds, studentId];

    setCheckedStudents(activeDate, nextCheckedIds);
  };

  return (
    <PageShell
      title="Kas"
      description="Checklist kas harian Senin–Kamis dengan simpan lokal terlebih dahulu."
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Tanggal aktif</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-slate-900">{formatDisplayDate(activeDate)}</p>
              <p className="text-sm text-slate-500">{formatWeekday(activeDate)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Pilih Tanggal
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={activeDate <= minDate}
              onClick={() => setActiveDate((current) => shiftIsoDate(current, -1))}
              className="h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setActiveDate(todayIsoDate())}
              className="h-11 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              Hari Ini
            </button>
            <button
              type="button"
              disabled={isDateAfter(shiftIsoDate(activeDate, 1), maxDate)}
              onClick={() => setActiveDate((current) => shiftIsoDate(current, 1))}
              className="h-11 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Besok
            </button>
          </div>

          {cashWarning ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Hari ini bukan hari kas. Tetap bisa input, tetapi ada warning.
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">Sudah bayar</p>
            <p className="text-sm font-semibold text-slate-900">
              {checkedCount} dari {totalCount} siswa
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((student, index) => {
                const checked = checkedStudentIds.includes(student.id);

                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => handleToggle(student.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">No. {index + 1}</p>
                        <p className="truncate text-base font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Nominal: {formatCurrency(settings.dailyCashNominal || 1000)}
                        </p>
                      </div>
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                          checked
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          Tersimpan lokal untuk tanggal {formatShortDisplayDate(activeDate)}.
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          Siswa yang dicentang hari ini: {checkedStudentNameList.length > 0 ? checkedStudentNameList.join(', ') : '-'}
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        title="Pilih Tanggal"
        description="Maksimal 30 hari ke belakang dari hari ini."
        onClose={() => setSheetOpen(false)}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Tanggal</span>
          <input
            type="date"
            value={activeDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => {
              setActiveDate(event.target.value);
              setSheetOpen(false);
            }}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
          />
        </label>
      </BottomSheet>
    </PageShell>
  );
}
