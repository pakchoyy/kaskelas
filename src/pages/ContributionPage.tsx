import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Save, CheckCheck, Edit2, ChevronDown, Plus, Minus } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { BottomSheet } from '../components/BottomSheet';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { useContributions } from '../hooks/useContributions';
import { contributionsApi } from '../services/api';
import { formatCurrency } from '../lib/format';
import { formatDisplayDate, formatWeekday, todayIsoDate } from '../lib/date';
import { requestSync } from '../lib/sync';

type ContributionType = 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji' | 'tabungan';
type WeekDayKey = 'senin' | 'selasa' | 'rabu' | 'kamis';

const weekDays: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'senin', label: 'Sen' },
  { key: 'selasa', label: 'Sel' },
  { key: 'rabu', label: 'Rab' },
  { key: 'kamis', label: 'Kam' },
];

const contributionTypes = [
  { value: 'kas-kelas' as const, label: 'Kas Kelas' },
  { value: 'amal-jumat' as const, label: 'Amal Jumat' },
  { value: 'paguyuban-ngaji' as const, label: 'Paguyuban Ngaji' },
  { value: 'tabungan' as const, label: 'Tabungan' },
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

function getFriday(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -2 : 5 - day;
  const friday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
  return toIsoLocalDate(friday);
}

function getMonthInfo(dateIso: string): { year: number; month: number; monthName: string } {
  const date = new Date(`${dateIso}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
  return { year, month, monthName };
}

export function ContributionPage() {
  const { students, cashRecords, setCheckedStudents, saveCurrentState, contributions, reload } = useAppData();
  const { settings, updateDailyCashNominal } = useAppSettings();
  
  const [contributionType, setContributionType] = useState<ContributionType>('kas-kelas');
  const [anchorDate, setAnchorDate] = useState(todayIsoDate());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // State untuk edit nominal Kas Kelas
  const [editNominalOpen, setEditNominalOpen] = useState(false);
  const [editNominalValue, setEditNominalValue] = useState('');
  
  // State untuk Amal Jumat - nominal per siswa
  const [amalJumatNominals, setAmalJumatNominals] = useState<Record<string, string>>({});
  const [amalSaving, setAmalSaving] = useState(false);

  // State untuk Tabungan
  const [tabunganSheetOpen, setTabunganSheetOpen] = useState(false);
  const [tabunganMode, setTabunganMode] = useState<'setor' | 'tarik'>('setor');
  const [tabunganStudentId, setTabunganStudentId] = useState<string | null>(null);
  const [tabunganNominal, setTabunganNominal] = useState('');
  const [tabunganDate, setTabunganDate] = useState(todayIsoDate());
  const [tabunganSaving, setTabunganSaving] = useState(false);

  // Kas Kelas logic
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const isCurrentWeek = useMemo(() => {
    const todayWeek = getWeekDates(todayIsoDate());
    return weekDates.senin === todayWeek.senin;
  }, [weekDates.senin]);

  const weekSummary = useMemo(() => {
    const dailyNominal = settings.dailyCashNominal || 2000;
    return weekDays.map((wd) => {
      const dateIso = weekDates[wd.key];
      const record = cashRecords[dateIso];
      const checkedIds = record?.checkedStudentIds ?? [];
      return {
        dayKey: wd.key,
        dayLabel: wd.label,
        date: dateIso,
        count: checkedIds.length,
        total: checkedIds.length * dailyNominal,
      };
    });
  }, [cashRecords, settings.dailyCashNominal, weekDates]);

  const kasKelasCheckState = useMemo(() => {
    const state: Record<string, Record<WeekDayKey, boolean>> = {};
    students.forEach((student) => {
      const studentState: Record<WeekDayKey, boolean> = {} as Record<WeekDayKey, boolean>;
      weekDays.forEach((wd) => {
        const dateIso = weekDates[wd.key];
        const record = cashRecords[dateIso];
        studentState[wd.key] = record?.checkedStudentIds.includes(student.id) ?? false;
      });
      state[student.id] = studentState;
    });
    return state;
  }, [cashRecords, students, weekDates]);

  // Amal Jumat logic
  const fridayDate = useMemo(() => getFriday(anchorDate), [anchorDate]);

  const {
    contributions: amalRecords,
    loading: amalLoading,
    addContribution: addAmalContribution,
    updateContribution: updateAmalContribution,
    removeContribution: removeAmalContribution,
  } = useContributions('amal-jumat', { date: fridayDate });

  const totalAmalJumat = useMemo(() => {
    return Object.values(amalJumatNominals).reduce((sum, val) => {
      const num = parseInt(val) || 0;
      return sum + num;
    }, 0);
  }, [amalJumatNominals]);

  // Sync Amal Jumat inputs with saved contributions when navigating weeks
  const amalSyncedDateRef = useRef<string | null>(null);
  useEffect(() => {
    if (amalSyncedDateRef.current === fridayDate) {
      return;
    }
    if (amalLoading) {
      return;
    }
    const next: Record<string, string> = {};
    amalRecords.forEach((c) => {
      next[c.studentId] = String(c.nominal);
    });
    setAmalJumatNominals(next);
    amalSyncedDateRef.current = fridayDate;
  }, [fridayDate, amalLoading, amalRecords]);

  // Paguyuban Ngaji logic
  const monthInfo = useMemo(() => getMonthInfo(anchorDate), [anchorDate]);
  const paguyubanNominal = 12000;

  const {
    toggleStudent: togglePaguyubanStudent,
    hasStudentPaid: hasPaguyubanPaid,
    getPaidStudentIds: getPaguyubanPaidIds,
  } = useContributions('paguyuban-ngaji', {
    periodMonth: monthInfo.month + 1,
    periodYear: monthInfo.year,
  });

  const paguyubanStats = useMemo(() => {
    const paidCount = getPaguyubanPaidIds().length;
    return {
      paidCount,
      total: paidCount * paguyubanNominal,
    };
  }, [getPaguyubanPaidIds, paguyubanNominal]);

  // Tabungan logic - calculate balance per student
  const tabunganBalances = useMemo(() => {
    return students.map(student => {
      const balance = contributions
        .filter(c => c.studentId === student.id && c.contributionType === 'tabungan')
        .reduce((sum, c) => sum + c.nominal, 0);
      
      return { student, balance };
    });
  }, [students, contributions]);

  const totalTabungan = useMemo(() => {
    return tabunganBalances.reduce((sum, item) => sum + item.balance, 0);
  }, [tabunganBalances]);

  const tabunganActiveStudent = useMemo(
    () => students.find(s => s.id === tabunganStudentId),
    [tabunganStudentId, students],
  );

  const handleKasKelasToggle = (studentId: string, dayKey: WeekDayKey) => {
    const dateIso = weekDates[dayKey];
    const record = cashRecords[dateIso];
    const currentChecked = record?.checkedStudentIds ?? [];
    const isChecked = currentChecked.includes(studentId);
    const newChecked = isChecked
      ? currentChecked.filter((id) => id !== studentId)
      : [...currentChecked, studentId];
    setCheckedStudents(dateIso, newChecked);
  };

  const handleKasKelasSave = () => {
    saveCurrentState();
    requestSync();
  };

  const handleEditNominalOpen = () => {
    setEditNominalValue(String(settings.dailyCashNominal || 2000));
    setEditNominalOpen(true);
  };

  const handleEditNominalSave = async () => {
    const nominal = Number(editNominalValue);
    if (Number.isFinite(nominal) && nominal > 0) {
      await updateDailyCashNominal(nominal);
    }
    setEditNominalOpen(false);
  };

  const handleAmalJumatChange = (studentId: string, value: string) => {
    setAmalJumatNominals((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleAmalJumatSave = async () => {
    setAmalSaving(true);
    try {
      for (const student of students) {
        const raw = amalJumatNominals[student.id] || '';
        const nominal = parseInt(raw, 10) || 0;
        const existing = amalRecords.find((c) => c.studentId === student.id);

        if (nominal > 0) {
          if (!existing) {
            await addAmalContribution(student.id, nominal, fridayDate);
          } else if (existing.nominal !== nominal) {
            await updateAmalContribution(existing.id, { nominal });
          }
        } else if (existing) {
          await removeAmalContribution(existing.id);
        }
      }
    } finally {
      setAmalSaving(false);
    }
  };

  const handlePaguyubanToggle = (studentId: string) => {
    togglePaguyubanStudent(studentId, paguyubanNominal);
  };

  const handlePaguyubanSave = () => {
    alert('Data Paguyuban Ngaji tersimpan otomatis.');
  };

  const handleTabunganOpen = (studentId: string, mode: 'setor' | 'tarik') => {
    setTabunganStudentId(studentId);
    setTabunganMode(mode);
    setTabunganNominal('');
    setTabunganDate(todayIsoDate());
    setTabunganSheetOpen(true);
  };

  const handleTabunganClose = () => {
    setTabunganSheetOpen(false);
    setTabunganStudentId(null);
    setTabunganNominal('');
  };

  const handleTabunganSave = async () => {
    if (!tabunganStudentId || !tabunganNominal || Number(tabunganNominal) <= 0) {
      alert('Mohon isi nominal dengan benar (harus lebih dari 0)');
      return;
    }

    setTabunganSaving(true);
    try {
      const amount = tabunganMode === 'setor' ? Number(tabunganNominal) : -Number(tabunganNominal);
      
      await contributionsApi.create({
        studentId: tabunganStudentId,
        contributionType: 'tabungan',
        date: tabunganDate,
        nominal: amount,
      });

      await reload();
      handleTabunganClose();
    } catch (err) {
      console.error('Failed to save tabungan:', err);
      alert(`Gagal menyimpan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTabunganSaving(false);
    }
  };

  const handlePrevPeriod = () => {
    if (contributionType === 'kas-kelas') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setDate(date.getDate() - 7);
        return toIsoLocalDate(date);
      });
    } else if (contributionType === 'amal-jumat') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setDate(date.getDate() - 7);
        return toIsoLocalDate(date);
      });
    } else if (contributionType === 'paguyuban-ngaji') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setMonth(date.getMonth() - 1);
        return toIsoLocalDate(date);
      });
    }
  };

  const handleNextPeriod = () => {
    if (contributionType === 'kas-kelas') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setDate(date.getDate() + 7);
        return toIsoLocalDate(date);
      });
    } else if (contributionType === 'amal-jumat') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setDate(date.getDate() + 7);
        return toIsoLocalDate(date);
      });
    } else if (contributionType === 'paguyuban-ngaji') {
      setAnchorDate((prev) => {
        const date = new Date(`${prev}T00:00:00`);
        date.setMonth(date.getMonth() + 1);
        return toIsoLocalDate(date);
      });
    }
  };

  const currentTypeLabel = contributionTypes.find((t) => t.value === contributionType)?.label || '';

  return (
    <PageShell title="Iuran" description="Catat iuran siswa untuk berbagai jenis iuran.">
      <div className="space-y-3">
        {/* Dropdown Jenis Iuran */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex h-12 w-full items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-900 shadow-soft"
          >
            {currentTypeLabel}
            <ChevronDown className="h-5 w-5 text-slate-500" strokeWidth={2} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full z-10 mt-1 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
              {contributionTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setContributionType(type.value);
                    setDropdownOpen(false);
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm font-medium transition first:rounded-t-2xl last:rounded-b-2xl ${
                    contributionType === type.value
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* MODE KAS KELAS */}
        {contributionType === 'kas-kelas' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">Kas Kelas</h3>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">Nominal harian</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrency(settings.dailyCashNominal || 2000)}
                  </p>
                  <button
                    type="button"
                    onClick={handleEditNominalOpen}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <Edit2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="text-sm font-semibold text-slate-900">
                  {formatWeekRange(weekDates)}
                </p>
                <button
                  type="button"
                  onClick={handleNextPeriod}
                  disabled={isCurrentWeek}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isCurrentWeek
                      ? 'bg-slate-50 text-slate-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>

              {students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              ) : (
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="w-[35%] px-2 py-2 text-left text-xs font-medium text-slate-500">Siswa</th>
                      {weekDays.map((wd) => (
                        <th key={wd.key} className="w-[16.25%] px-1 py-2 text-center text-xs font-medium text-slate-500">
                          {wd.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-slate-50 last:border-0">
                        <td className="px-2 py-2 text-xs font-medium text-slate-900">{student.name}</td>
                        {weekDays.map((wd) => {
                          const isChecked = kasKelasCheckState[student.id]?.[wd.key] ?? false;
                          return (
                            <td key={wd.key} className="px-1 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleKasKelasToggle(student.id, wd.key)}
                                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition ${
                                  isChecked
                                    ? 'bg-brand-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                                }`}
                              >
                                {isChecked && <Check className="h-4 w-4" strokeWidth={2.5} />}
                              </button>
                            </td>
                          );
                        })}
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
                    onClick={handleKasKelasSave}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
                  >
                    <Save className="h-4 w-4" strokeWidth={2} />
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MODE AMAL JUMAT */}
        {contributionType === 'amal-jumat' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">Amal Jumat</h3>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="text-sm font-medium text-slate-700">
                  {formatWeekday(fridayDate)}, {formatDisplayDate(fridayDate)}
                </p>
                <button
                  type="button"
                  onClick={handleNextPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              {amalLoading && amalRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Memuat data...</p>
              ) : students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => (
                    <div key={student.id} className={`flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                      <p className="text-sm font-medium text-slate-900">{student.name}</p>
                      <input
                        type="number"
                        placeholder="0"
                        step="1000"
                        value={amalJumatNominals[student.id] || ''}
                        onChange={(e) => handleAmalJumatChange(student.id, e.target.value)}
                        className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">Total Amal Jumat</p>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(totalAmalJumat)}
                  </p>
                  <button
                    type="button"
                    onClick={handleAmalJumatSave}
                    disabled={amalSaving}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" strokeWidth={2} />
                    {amalSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* MODE PAGUYUBAN NGAJI */}
        {contributionType === 'paguyuban-ngaji' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">Paguyuban Ngaji</h3>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="text-sm font-medium text-slate-700">{monthInfo.monthName}</p>
                <button
                  type="button"
                  onClick={handleNextPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Iuran per siswa</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(paguyubanNominal)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              {students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => {
                    const isPaid = hasPaguyubanPaid(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handlePaguyubanToggle(student.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}
                      >
                        <p className="text-sm font-medium text-slate-900">{student.name}</p>
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${
                            isPaid ? 'bg-brand-600 text-white' : 'border-2 border-slate-300 text-slate-300'
                          }`}
                        >
                          {isPaid && <Check className="h-4 w-4" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Sudah bayar</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{paguyubanStats.paidCount} siswa</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-brand-700">{formatCurrency(paguyubanStats.total)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePaguyubanSave}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              <Save className="h-5 w-5" strokeWidth={2} />
              Simpan
            </button>
          </>
        )}

        {/* MODE TABUNGAN */}
        {contributionType === 'tabungan' && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total Tabungan Kelas</p>
              <p className="mt-1 text-2xl font-semibold text-brand-700">{formatCurrency(totalTabungan)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
              {students.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tabunganBalances.map(({ student, balance }, index) => (
                    <li key={student.id} className={`flex items-center justify-between gap-3 px-4 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Saldo: {formatCurrency(balance)}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleTabunganOpen(student.id, 'setor')}
                          className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Setor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTabunganOpen(student.id, 'tarik')}
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
          </>
        )}
      </div>

      {/* Bottom Sheet - Tabungan */}
      <BottomSheet
        open={tabunganSheetOpen}
        onClose={handleTabunganClose}
        title={tabunganMode === 'setor' ? 'Setor Tabungan' : 'Tarik Tabungan'}
      >
        <div className="space-y-4">
          {tabunganActiveStudent && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Siswa</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{tabunganActiveStudent.name}</p>
            </div>
          )}

          <div>
            <label htmlFor="tabungan-nominal" className="block text-sm font-medium text-slate-700">
              Nominal
            </label>
            <input
              id="tabungan-nominal"
              type="number"
              step="1000"
              placeholder="0"
              value={tabunganNominal}
              onChange={(e) => setTabunganNominal(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label htmlFor="tabungan-date" className="block text-sm font-medium text-slate-700">
              Tanggal
            </label>
            <input
              id="tabungan-date"
              type="date"
              value={tabunganDate}
              onChange={(e) => setTabunganDate(e.target.value)}
              max={todayIsoDate()}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <button
            type="button"
            onClick={handleTabunganSave}
            disabled={tabunganSaving || !tabunganNominal || Number(tabunganNominal) <= 0}
            className="h-12 w-full rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {tabunganSaving ? 'Menyimpan...' : tabunganMode === 'setor' ? 'Setor' : 'Tarik'}
          </button>
        </div>
      </BottomSheet>

      {/* Bottom Sheet - Edit Nominal Kas Kelas */}
      <BottomSheet
        open={editNominalOpen}
        title="Edit Nominal"
        description="Ubah nominal iuran harian Kas Kelas"
        onClose={() => setEditNominalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="nominal" className="mb-2 block text-sm font-medium text-slate-700">
              Nominal iuran
            </label>
            <input
              id="nominal"
              type="number"
              value={editNominalValue}
              onChange={(e) => setEditNominalValue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditNominalOpen(false)}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleEditNominalSave}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white"
            >
              Simpan
            </button>
          </div>
        </div>
      </BottomSheet>
    </PageShell>
  );
}
