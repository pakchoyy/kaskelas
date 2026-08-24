import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Save, Edit2, ChevronDown } from 'lucide-react';
import { PageShell } from '../components/PageShell';
import { BottomSheet } from '../components/BottomSheet';
import { NominalStepper } from '../components/NominalStepper';
import { NotesSection } from '../components/NotesSection';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { useContributions } from '../hooks/useContributions';
import { useNotes } from '../hooks/useNotes';
import { useAmalJumatMarker } from '../hooks/useAmalJumatMarker';
import { settingsApi } from '../services/api';
import { formatCurrency } from '../lib/format';
import { formatDisplayDate, formatWeekday, todayIsoDate, shiftIsoDate } from '../lib/date';
import { requestSync } from '../lib/sync';

type ContributionType = 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji' | 'tabungan' | 'lks';
type WeekDayKey = 'senin' | 'selasa' | 'rabu' | 'kamis';
type SemesterNumber = 1 | 2;

const weekDays: Array<{ key: WeekDayKey; label: string }> = [
  { key: 'senin', label: 'Sen' },
  { key: 'selasa', label: 'Sel' },
  { key: 'rabu', label: 'Rab' },
  { key: 'kamis', label: 'Kam' },
];

const contributionTypes = [
  { value: 'kas-kelas' as const, label: 'Kas Kelas' },
  { value: 'tabungan' as const, label: 'Tabungan' },
  { value: 'amal-jumat' as const, label: 'Amal Jumat' },
  { value: 'paguyuban-ngaji' as const, label: 'Paguyuban Ngaji' },
  { value: 'lks' as const, label: 'LKS' },
];

const semesterOptions: Array<{ value: SemesterNumber; label: string }> = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
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
  const [tabunganMode, setTabunganMode] = useState<'setor' | 'tarik'>('setor');
  const [tabunganDate, setTabunganDate] = useState(todayIsoDate());
  const [tabunganNominals, setTabunganNominals] = useState<Record<string, string>>({});
  const [tabunganTarikNotes, setTabunganTarikNotes] = useState<Record<string, string>>({});
  const [tabunganSaving, setTabunganSaving] = useState(false);

  // State untuk Edit Saldo Tabungan per siswa
  const [editSaldoStudent, setEditSaldoStudent] = useState<{ id: string; name: string } | null>(null);
  const [editSaldoValue, setEditSaldoValue] = useState('');
  const [editSaldoSaving, setEditSaldoSaving] = useState(false);

  // Kas Kelas logic
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

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
    loadingRef: amalLoadingRef,
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

  // Reset Amal Jumat inputs immediately when navigating weeks so stale
  // values are never edited while the new week is still loading
  useEffect(() => {
    setAmalJumatNominals({});
    amalSyncedDateRef.current = null;
  }, [fridayDate]);

  useEffect(() => {
    if (amalSyncedDateRef.current === fridayDate) {
      return;
    }
    if (amalLoadingRef.current) {
      return;
    }
    const next: Record<string, string> = {};
    amalRecords.forEach((c) => {
      next[c.studentId] = String(c.nominal);
    });
    setAmalJumatNominals(next);
    amalSyncedDateRef.current = fridayDate;
  }, [fridayDate, amalLoading, amalRecords]);

  // Tabungan logic - per-day records
  const {
    contributions: tabunganDayRecords,
    loading: tabunganLoading,
    loadingRef: tabunganLoadingRef,
    addContribution: addTabunganContribution,
    updateContribution: updateTabunganContribution,
    removeContribution: removeTabunganContribution,
  } = useContributions('tabungan', { date: tabunganDate });

  // Sync Tabungan inputs with saved contributions when navigating days
  const tabunganSyncedDateRef = useRef<string | null>(null);

  // Reset Tabungan inputs immediately when navigating days so stale values
  // are never edited while the new day is still loading
  useEffect(() => {
    setTabunganNominals({});
    setTabunganTarikNotes({});
    tabunganSyncedDateRef.current = null;
  }, [tabunganDate, tabunganMode]);

  useEffect(() => {
    if (tabunganSyncedDateRef.current === `${tabunganDate}-${tabunganMode}`) {
      return;
    }
    if (tabunganLoadingRef.current) {
      return;
    }
    const next: Record<string, string> = {};
    const nextNotes: Record<string, string> = {};
    tabunganDayRecords.forEach((c) => {
      const isTarikRecord = c.nominal < 0;
      if (tabunganMode === 'tarik' && !isTarikRecord) return;
      if (tabunganMode === 'setor' && isTarikRecord) return;
      next[c.studentId] = String(Math.abs(c.nominal));
      if (c.note) nextNotes[c.studentId] = c.note;
    });
    setTabunganNominals(next);
    setTabunganTarikNotes(nextNotes);
    tabunganSyncedDateRef.current = `${tabunganDate}-${tabunganMode}`;
  }, [tabunganDate, tabunganMode, tabunganLoading, tabunganDayRecords]);

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

  // LKS logic - per semester dan tahun
  const [lksSemester, setLksSemester] = useState<SemesterNumber>(1);
  const [lksYear, setLksYear] = useState(() => new Date().getFullYear());
  const [lksSemesterOpen, setLksSemesterOpen] = useState(false);
  const [editLksNominalOpen, setEditLksNominalOpen] = useState(false);
  const [editLksNominalValue, setEditLksNominalValue] = useState('');
  const [lksNominal, setLksNominal] = useState(71000);

  const {
    toggleStudent: toggleLksStudent,
    hasStudentPaid: hasLksPaid,
    getPaidStudentIds: getLksPaidIds,
    defaultNominal: lksDefaultNominal,
  } = useContributions('lks', {
    periodMonth: lksSemester,
    periodYear: lksYear,
  });

  useEffect(() => {
    if (lksDefaultNominal && lksDefaultNominal > 0) {
      setLksNominal(lksDefaultNominal);
    }
  }, [lksDefaultNominal]);

  const lksStats = useMemo(() => {
    const paidCount = getLksPaidIds().length;
    return {
      paidCount,
      total: paidCount * lksNominal,
    };
  }, [getLksPaidIds, lksNominal]);

  const lksPeriodKey = `${lksYear}-S${lksSemester}`;
  const lksNotes = useNotes('lks', lksPeriodKey);

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

  // Notes: Kas Kelas per minggu (kunci = hari Senin), Tabungan per hari
  const kasKelasNotes = useNotes('kas_kelas', weekDates.senin);
  const tabunganNotes = useNotes('tabungan', tabunganDate);

  // Amal Jumat marker: penanda "diserahkan" per tanggal Jumat
  const amalMarker = useAmalJumatMarker(fridayDate);

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
    const failed: string[] = [];
    try {
      for (const student of students) {
        const raw = amalJumatNominals[student.id] || '';
        const nominal = parseInt(raw, 10) || 0;
        const existing = amalRecords.find((c) => c.studentId === student.id);

        if (nominal > 0) {
          if (!existing) {
            const ok = await addAmalContribution(student.id, nominal, fridayDate);
            if (!ok) failed.push(student.name);
          } else if (existing.nominal !== nominal) {
            const ok = await updateAmalContribution(existing.id, { nominal });
            if (!ok) failed.push(student.name);
          }
        } else if (existing) {
          const ok = await removeAmalContribution(existing.id);
          if (!ok) failed.push(student.name);
        }
      }

      if (failed.length > 0) {
        alert(`Gagal menyimpan untuk: ${failed.join(', ')}. Coba lagi.`);
      } else {
        requestSync();
      }
    } catch (err) {
      console.error('Failed to save amal jumat:', err);
      alert(`Gagal menyimpan: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const handleLksToggle = (studentId: string) => {
    toggleLksStudent(studentId, lksNominal);
  };

  const handleLksSave = () => {
    alert('Data LKS tersimpan otomatis.');
  };

  const handleLksPrevYear = () => {
    setLksYear((prev) => prev - 1);
  };

  const handleLksNextYear = () => {
    setLksYear((prev) => prev + 1);
  };

  const handleEditLksNominalOpen = () => {
    setEditLksNominalValue(String(lksNominal));
    setEditLksNominalOpen(true);
  };

  const handleEditLksNominalSave = async () => {
    const nominal = Number(editLksNominalValue);
    if (Number.isFinite(nominal) && nominal > 0) {
      try {
        await settingsApi.update('lks', { defaultNominal: nominal });
        setLksNominal(nominal);
      } catch (err) {
        console.error('Failed to update LKS nominal:', err);
      }
    }
    setEditLksNominalOpen(false);
  };

  const handleTabunganPrevDay = () => {
    setTabunganDate((prev) => shiftIsoDate(prev, -1) || todayIsoDate());
  };

  const handleTabunganNextDay = () => {
    setTabunganDate((prev) => shiftIsoDate(prev, 1) || todayIsoDate());
  };

  const autosaveTabungan = async (studentId: string, nominalStr: string, noteStr: string) => {
    if (tabunganLoadingRef.current) return;
    const nominal = parseInt(nominalStr, 10) || 0;
    const existing = tabunganDayRecords.find((c) => c.studentId === studentId);
    const noteValue = tabunganMode === 'tarik' ? (noteStr.trim() || null) : null;

    try {
      let changed = false;
      if (nominal > 0) {
        if (tabunganMode === 'tarik' && !noteValue) return; // tunggu keperluan diisi
        const signedNominal = tabunganMode === 'tarik' ? -nominal : nominal;
        if (!existing) {
          await addTabunganContribution(studentId, signedNominal, tabunganDate, undefined, undefined, noteValue);
          changed = true;
        } else if (existing.nominal !== signedNominal || (existing.note || null) !== noteValue) {
          await updateTabunganContribution(existing.id, { nominal: signedNominal, note: noteValue });
          changed = true;
        }
      } else if (existing && nominal === 0 && !noteStr) {
        await removeTabunganContribution(existing.id);
        changed = true;
      }
      if (changed) await reload();
    } catch (err) {
      console.error('Autosave tabungan gagal:', err);
    }
  };

  const handleTabunganChange = (studentId: string, value: string) => {
    setTabunganNominals((prev) => ({ ...prev, [studentId]: value }));
    // autosave per siswa setelah nominal berubah
    setTimeout(() => autosaveTabungan(studentId, value, tabunganTarikNotes[studentId] || ''), 0);
  };

  const handleTabunganNoteChange = (studentId: string, value: string) => {
    setTabunganTarikNotes((prev) => ({ ...prev, [studentId]: value }));
    const nominalVal = tabunganNominals[studentId] || '';
    setTimeout(() => autosaveTabungan(studentId, nominalVal, value), 0);
  };

  const handleTabunganSave = async () => {
    setTabunganSaving(true);
    try {
      for (const student of students) {
        const raw = tabunganNominals[student.id] || '';
        const nominal = parseInt(raw, 10) || 0;
        const existing = tabunganDayRecords.find((c) => c.studentId === student.id);
        const noteValue = tabunganMode === 'tarik' ? (tabunganTarikNotes[student.id]?.trim() || null) : null;

        if (nominal > 0) {
          if (tabunganMode === 'tarik' && !noteValue) {
            // lewati siswa ini, biar siswa lain tetap tersimpan (autosave sudah per siswa)
            continue;
          }
          const signedNominal = tabunganMode === 'setor' ? nominal : -nominal;
          if (!existing) {
            await addTabunganContribution(student.id, signedNominal, tabunganDate, undefined, undefined, noteValue);
          } else if (existing.nominal !== signedNominal || (existing.note || null) !== noteValue) {
            await updateTabunganContribution(existing.id, { nominal: signedNominal, note: noteValue });
          }
        } else if (existing) {
          await removeTabunganContribution(existing.id);
        }
      }
      await reload();
    } catch (err) {
      console.error('Failed to save tabungan:', err);
      alert(`Gagal menyimpan: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTabunganSaving(false);
    }
  };

  const handleEditSaldoOpen = (student: { id: string; name: string }) => {
    const balance = tabunganBalances.find((b) => b.student.id === student.id)?.balance ?? 0;
    setEditSaldoStudent(student);
    setEditSaldoValue(String(balance));
  };

  const handleEditSaldoSave = async () => {
    if (!editSaldoStudent) {
      return;
    }

    const target = Number(editSaldoValue);
    if (!Number.isFinite(target) || target < 0) {
      alert('Masukkan saldo yang valid (angka 0 atau lebih).');
      return;
    }

    const current = tabunganBalances.find((b) => b.student.id === editSaldoStudent.id)?.balance ?? 0;
    const delta = Math.round(target - current);

    setEditSaldoSaving(true);
    try {
      if (delta !== 0) {
        const today = todayIsoDate();
        const existingToday = contributions.find(
          (c) =>
            c.studentId === editSaldoStudent.id &&
            c.contributionType === 'tabungan' &&
            c.date === today
        );

        if (existingToday) {
          await updateTabunganContribution(existingToday.id, { nominal: existingToday.nominal + delta });
        } else {
          await addTabunganContribution(editSaldoStudent.id, delta, today);
        }
      }
      setEditSaldoStudent(null);
      setEditSaldoValue('');
      await reload();
    } catch (err) {
      console.error('Failed to edit saldo:', err);
      alert(`Gagal mengubah saldo: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setEditSaldoSaving(false);
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
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

            <NotesSection
              notes={kasKelasNotes.notes}
              loading={kasKelasNotes.loading}
              onAdd={kasKelasNotes.addNote}
              onUpdate={kasKelasNotes.updateNote}
              onDelete={kasKelasNotes.removeNote}
            />
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
              {amalLoading ? (
                <p className="py-6 text-center text-sm text-slate-500">Memuat data...</p>
              ) : students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => (
                    <div key={student.id} className={`flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                      <p className="text-sm font-medium text-slate-900">{student.name}</p>
                      <NominalStepper
                        value={amalJumatNominals[student.id] || ''}
                        onChange={(value) => handleAmalJumatChange(student.id, value)}
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

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <button
                type="button"
                onClick={() => amalMarker.toggle()}
                disabled={amalMarker.loading || amalMarker.saving}
                className="flex w-full items-center justify-between gap-3"
              >
                <span className="text-left">
                  <span className="block text-sm font-semibold text-slate-900">Diserahkan</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Penanda uang amal Jumat sudah diserahkan
                  </span>
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                    amalMarker.handedOver
                      ? 'bg-brand-600 text-white'
                      : 'border-2 border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
              </button>
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

        {/* MODE LKS */}
        {contributionType === 'lks' && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              <h3 className="text-sm font-semibold text-slate-900">LKS</h3>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleLksPrevYear}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Tahun sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="text-sm font-medium text-slate-700">{lksYear}</p>
                <button
                  type="button"
                  onClick={handleLksNextYear}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Tahun berikutnya"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setLksSemesterOpen(!lksSemesterOpen)}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-900"
                >
                  {lksSemester === 1 ? 'Semester 1' : 'Semester 2'}
                  <ChevronDown className="h-5 w-5 text-slate-500" strokeWidth={2} />
                </button>
                {lksSemesterOpen && (
                  <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    {semesterOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setLksSemester(option.value);
                          setLksSemesterOpen(false);
                        }}
                        className={`block w-full px-4 py-3 text-left text-sm ${
                          lksSemester === option.value
                            ? 'bg-brand-50 font-semibold text-brand-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Iuran per siswa</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-slate-900">{formatCurrency(lksNominal)}</p>
                  <button
                    type="button"
                    onClick={handleEditLksNominalOpen}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    aria-label="Edit nominal LKS"
                  >
                    <Edit2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              {students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa terdaftar.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => {
                    const isPaid = hasLksPaid(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleLksToggle(student.id)}
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
                  <p className="mt-1 text-base font-semibold text-slate-900">{lksStats.paidCount} siswa</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-brand-700">{formatCurrency(lksStats.total)}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLksSave}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              <Save className="h-5 w-5" strokeWidth={2} />
              Simpan
            </button>

            <NotesSection
              notes={lksNotes.notes}
              loading={lksNotes.loading}
              onAdd={lksNotes.addNote}
              onUpdate={lksNotes.updateNote}
              onDelete={lksNotes.removeNote}
            />
          </>
        )}

        {/* MODE TABUNGAN */}
        {contributionType === 'tabungan' && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total Tabungan Kelas</p>
              <p className="mt-1 text-2xl font-semibold text-brand-700">{formatCurrency(totalTabungan)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTabunganPrevDay}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <p className="text-sm font-medium text-slate-700">
                  {formatWeekday(tabunganDate)}, {formatDisplayDate(tabunganDate)}
                </p>
                <button
                  type="button"
                  onClick={handleTabunganNextDay}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTabunganMode('setor')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    tabunganMode === 'setor'
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Setor
                </button>
                <button
                  type="button"
                  onClick={() => setTabunganMode('tarik')}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    tabunganMode === 'tarik'
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  Tarik
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
              {tabunganLoading ? (
                <p className="py-6 text-center text-sm text-slate-500">Memuat data...</p>
              ) : students.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Belum ada siswa. Tambah data siswa dulu di menu Siswa.</p>
              ) : (
                <div className="space-y-2">
                  {students.map((student, index) => {
                    const balance = tabunganBalances.find((item) => item.student.id === student.id)?.balance ?? 0;
                    const hasNominal = !!(tabunganNominals[student.id] && parseInt(tabunganNominals[student.id], 10) > 0);
                    return (
                      <div key={student.id} className={`rounded-lg border border-slate-100 p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{student.name}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <p className="text-xs text-slate-500">Saldo: {formatCurrency(balance)}</p>
                              <button
                                type="button"
                                onClick={() => handleEditSaldoOpen({ id: student.id, name: student.name })}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                                aria-label={`Edit saldo ${student.name}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                          <NominalStepper
                            value={tabunganNominals[student.id] || ''}
                            onChange={(value) => handleTabunganChange(student.id, value)}
                          />
                        </div>
                        {tabunganMode === 'tarik' && hasNominal && (
                          <input
                            type="text"
                            placeholder="Buat apa? cth: beli buku"
                            value={tabunganTarikNotes[student.id] || ''}
                            onChange={(e) => handleTabunganNoteChange(student.id, e.target.value)}
                            className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">Total</p>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(
                      Object.values(tabunganNominals).reduce((sum, val) => {
                        const num = parseInt(val, 10) || 0;
                        return sum + num;
                      }, 0)
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleTabunganSave}
                    disabled={tabunganSaving}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" strokeWidth={2} />
                    {tabunganSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </div>

            <NotesSection
              notes={tabunganNotes.notes}
              loading={tabunganNotes.loading}
              onAdd={tabunganNotes.addNote}
              onUpdate={tabunganNotes.updateNote}
              onDelete={tabunganNotes.removeNote}
            />
          </>
        )}
      </div>

      {/* Bottom Sheet - Edit Nominal Kas Kelas */}
      <BottomSheet
        open={editNominalOpen}
        title="Edit Nominal"
        description="Ubah nominal iuran harian Kas Kelas"
        onClose={() => setEditNominalOpen(false)}
      >        <div className="space-y-4">
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

      {/* Bottom Sheet - Edit Nominal LKS */}
      <BottomSheet
        open={editLksNominalOpen}
        title="Edit Nominal LKS"
        description="Ubah nominal iuran LKS per siswa"
        onClose={() => setEditLksNominalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editLksNominal" className="mb-2 block text-sm font-medium text-slate-700">
              Nominal iuran LKS
            </label>
            <input
              id="editLksNominal"
              type="number"
              min="0"
              value={editLksNominalValue}
              onChange={(e) => setEditLksNominalValue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Berlaku untuk transaksi LKS yang baru dicatat.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditLksNominalOpen(false)}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleEditLksNominalSave}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white"
            >
              Simpan
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Sheet - Edit Saldo Tabungan */}
      <BottomSheet
        open={editSaldoStudent !== null}
        title="Edit Saldo Tabungan"
        description={editSaldoStudent ? `Koreksi total saldo ${editSaldoStudent.name}` : undefined}
        onClose={() => {
          if (!editSaldoSaving) {
            setEditSaldoStudent(null);
            setEditSaldoValue('');
          }
        }}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="editSaldo" className="mb-2 block text-sm font-medium text-slate-700">
              Total saldo yang benar
            </label>
            <input
              id="editSaldo"
              type="number"
              min="0"
              step="1000"
              value={editSaldoValue}
              onChange={(e) => setEditSaldoValue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <p className="mt-2 text-xs text-slate-500">
              Saldo akan disesuaikan (ditambah/dikurangi) agar total menjadi nominal di atas.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditSaldoStudent(null);
                setEditSaldoValue('');
              }}
              disabled={editSaldoSaving}
              className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleEditSaldoSave}
              disabled={editSaldoSaving}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {editSaldoSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </PageShell>
  );
}
