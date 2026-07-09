import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { formatCurrency } from '../lib/format';
import { formatDisplayDate, isCashDay, todayIsoDate } from '../lib/date';
import { requestSync } from '../lib/sync';

type WeekDayKey = 'senin' | 'selasa' | 'rabu' | 'kamis';

const weekDays: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'senin', label: 'Sen' },
  { key: 'selasa', label: 'Sel' },
  { key: 'rabu', label: 'Rab' },
  { key: 'kamis', label: 'Kam' },
];

function toIsoLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function getWeekDates(anchorDateIso: string): Record<WeekDayKey, string> {
  const monday = getMonday(new Date(`${anchorDateIso}T00:00:00`));
  return {
    senin: toIsoLocalDate(monday),
    selasa: toIsoLocalDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1)),
    rabu: toIsoLocalDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2)),
    kamis: toIsoLocalDate(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)),
  };
}

function formatWeekRange(weekDates: Record<WeekDayKey, string>): string {
  return `${formatDisplayDate(weekDates.senin)} - ${formatDisplayDate(weekDates.kamis)}`;
}

function getIsoWeekNumber(dateIso: string): number {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

export function CashPage() {
  const { students, cashRecords, setCheckedStudents, saveCurrentState } = useAppData();
  const { settings } = useAppSettings();
  const [anchorDate, setAnchorDate] = useState(todayIsoDate());

  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const weekNumber = useMemo(() => getIsoWeekNumber(weekDates.senin), [weekDates.senin]);
  const isCurrentWeek = useMemo(() => {
    const todayWeek = getWeekDates(todayIsoDate());
    return weekDates.senin === todayWeek.senin;
  }, [weekDates.senin]);

  const weekSummary = useMemo(() => {
    return students.map((student) => {
      const checkedByDay = {
        senin: cashRecords[weekDates.senin]?.checkedStudentIds.includes(student.id) ?? false,
        selasa: cashRecords[weekDates.selasa]?.checkedStudentIds.includes(student.id) ?? false,
        rabu: cashRecords[weekDates.rabu]?.checkedStudentIds.includes(student.id) ?? false,
        kamis: cashRecords[weekDates.kamis]?.checkedStudentIds.includes(student.id) ?? false,
      };

      const paidCount = Object.values(checkedByDay).filter(Boolean).length;

      return {
        student,
        checkedByDay,
        paidCount,
        total: paidCount * (settings.dailyCashNominal || 1000),
      };
    });
  }, [cashRecords, settings.dailyCashNominal, students, weekDates]);

  const weekProgress = useMemo(() => {
    const totalSlots = students.length * weekDays.length;
    const filledSlots = weekSummary.reduce((sum, item) => sum + item.paidCount, 0);
    return { totalSlots, filledSlots };
  }, [students.length, weekSummary]);

  const canGoNext = useMemo(() => {
    const nextMonday = new Date(`${weekDates.senin}T00:00:00`);
    nextMonday.setDate(nextMonday.getDate() + 7);
    return toIsoLocalDate(nextMonday) <= todayIsoDate();
  }, [weekDates.senin]);

  const moveWeek = (offsetWeeks: number) => {
    const date = new Date(`${weekDates.senin}T00:00:00`);
    date.setDate(date.getDate() + offsetWeeks * 7);
    setAnchorDate(toIsoLocalDate(date));
  };

  const handleToggle = (studentId: string, day: WeekDayKey) => {
    const targetDate = weekDates[day];
    const currentIds = cashRecords[targetDate]?.checkedStudentIds ?? [];
    const nextCheckedIds = currentIds.includes(studentId)
      ? currentIds.filter((id) => id !== studentId)
      : [...currentIds, studentId];

    setCheckedStudents(targetDate, nextCheckedIds);
  };

  const handleSave = () => {
    saveCurrentState();
    requestSync();
  };

  return (
    <PageShell title={`Kas Minggu ${weekNumber}`} description="Checklist kas mingguan Senin–Kamis.">
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Rentang minggu</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatWeekRange(weekDates)}</p>
              <p className="mt-1 text-sm text-slate-500">{isCurrentWeek ? 'Minggu aktif' : 'Minggu yang dipilih'}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => moveWeek(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                aria-label="Minggu sebelumnya"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => moveWeek(1)}
                disabled={!canGoNext}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Minggu berikutnya"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-brand-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-medium text-brand-900">Progress minggu</p>
              <p className="font-semibold text-brand-700">
                {weekProgress.filledSlots} / {weekProgress.totalSlots}
              </p>
            </div>
            <div className="mt-2 h-2 rounded-full bg-brand-100">
              <div
                className="h-2 rounded-full bg-brand-600 transition-all"
                style={{
                  width: `${weekProgress.totalSlots > 0 ? (weekProgress.filledSlots / weekProgress.totalSlots) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {weekDays.map((day) => {
              const date = weekDates[day.key];
              return (
                <div key={day.key} className="rounded-2xl bg-slate-50 px-2 py-3">
                  <p>{day.label}</p>
                  <p className="mt-1 normal-case tracking-normal text-slate-400">{formatDisplayDate(date)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-4 py-3 font-medium">Siswa</th>
                    {weekDays.map((day) => (
                      <th key={day.key} className="px-3 py-3 text-center font-medium">{day.label}</th>
                    ))}
                    <th className="px-4 py-3 font-medium">Bayar</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weekSummary.map(({ student, checkedByDay, paidCount, total }, index) => (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="sticky left-0 bg-inherit px-4 py-4 align-middle">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">No. {index + 1}</p>
                        <p className="truncate text-sm font-semibold text-slate-900">{student.name}</p>
                      </td>
                      {weekDays.map((day) => {
                        const date = weekDates[day.key];
                        const checked = checkedByDay[day.key];
                        const disabled = !isCashDay(date);

                        return (
                          <td key={day.key} className="px-3 py-4 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => handleToggle(student.id, day.key)}
                              disabled={disabled}
                              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full border transition ${
                                checked
                                  ? 'border-brand-500 bg-brand-500 text-white'
                                  : disabled
                                    ? 'border-slate-200 bg-slate-100 text-slate-300'
                                    : 'border-slate-300 bg-white text-transparent'
                              }`}
                              aria-label={`${student.name} ${day.label}`}
                            >
                              {checked ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {paidCount} / 4
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-brand-700">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total pembayaran minggu</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {formatCurrency(weekSummary.reduce((sum, item) => sum + item.total, 0))}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="flex h-12 items-center gap-2 rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              <Save className="h-5 w-5" strokeWidth={2} />
              Simpan
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
