import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Save, CheckCheck } from 'lucide-react';
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
  if (isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  if (isNaN(date.getTime())) {
    return new Date(NaN);
  }

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

export function CashPage() {
  const { students, cashRecords, setCheckedStudents, saveCurrentState } = useAppData();
  const { settings } = useAppSettings();
  const [anchorDate, setAnchorDate] = useState(todayIsoDate());

  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
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

  const handleCheckAll = (day: WeekDayKey) => {
    const targetDate = weekDates[day];
    const currentIds = cashRecords[targetDate]?.checkedStudentIds ?? [];
    const allIds = students.map((s) => s.id);
    const nextCheckedIds = allIds.every((id) => currentIds.includes(id)) ? [] : allIds;
    setCheckedStudents(targetDate, nextCheckedIds);
  };

  const allChecked = (day: WeekDayKey) => {
    const targetDate = weekDates[day];
    const currentIds = cashRecords[targetDate]?.checkedStudentIds ?? [];
    return students.length > 0 && students.every((s) => currentIds.includes(s.id));
  };

  const handleSave = () => {
    saveCurrentState();
    requestSync();
  };

  return (
    <PageShell title="Kas" description={`Mingguan ${formatWeekRange(weekDates)}`}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {isCurrentWeek ? 'Minggu ini' : 'Minggu lalu'}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveWeek(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200"
                aria-label="Minggu sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => moveWeek(1)}
                disabled={!canGoNext}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-30"
                aria-label="Minggu berikutnya"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-1.5 rounded-full bg-brand-500 transition-all"
                style={{
                  width: `${weekProgress.totalSlots > 0 ? (weekProgress.filledSlots / weekProgress.totalSlots) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-brand-700">
              {weekProgress.filledSlots}/{weekProgress.totalSlots}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</div>
          ) : (
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="w-[76px] px-2 py-2 font-medium text-slate-500">Siswa</th>
                  {weekDays.map((day) => (
                    <th key={day.key} className="w-[44px] px-1 py-2 text-center">
                      <p className="font-medium text-slate-500">{day.label}</p>
                      <button
                        type="button"
                        onClick={() => handleCheckAll(day.key)}
                        disabled={!isCashDay(weekDates[day.key])}
                        className={`mt-0.5 mx-auto flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[9px] font-semibold uppercase transition disabled:opacity-30 ${
                          allChecked(day.key)
                            ? 'bg-brand-100 text-brand-700'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <CheckCheck className="h-2.5 w-2.5" strokeWidth={3} />
                        semua
                      </button>
                    </th>
                  ))}
                  <th className="w-[56px] px-2 py-2 text-right font-medium text-slate-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weekSummary.map(({ student, checkedByDay, total }) => (
                  <tr key={student.id}>
                    <td className="truncate px-2 py-2.5 font-medium text-slate-900">
                      {student.name}
                    </td>
                    {weekDays.map((day) => {
                      const date = weekDates[day.key];
                      const checked = checkedByDay[day.key];
                      const disabled = !isCashDay(date);
                      return (
                        <td key={day.key} className="px-1 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle(student.id, day.key)}
                            disabled={disabled}
                            className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border transition ${
                              checked
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : disabled
                                  ? 'border-slate-200 bg-slate-100 text-slate-300'
                                  : 'border-slate-300 bg-white text-transparent'
                            }`}
                            aria-label={`${student.name} ${day.label}`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2.5 text-right font-semibold text-brand-700">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">Total minggu</p>
            <div className="flex items-center gap-3">
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(weekSummary.reduce((sum, item) => sum + item.total, 0))}
              </p>
              <button
                type="button"
                onClick={handleSave}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
              >
                <Save className="h-4 w-4" strokeWidth={2} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
