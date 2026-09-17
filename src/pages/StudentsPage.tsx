import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Download, Trash2, Upload } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppMode } from '../hooks/useAppMode';
import { isKwaru } from '../lib/appScope';
import { extractStudentNames, parseStudentRowsWithBlok, readExcelRows } from '../lib/excel';

type StudentFormMode = 'create' | 'edit';

export function StudentsPage() {
  const { mode } = useAppMode();
  const { students: allStudents, addStudent, updateStudent, deleteStudent, deleteAllStudents } = useAppData();
  const students = useMemo(() => allStudents.filter((s) => (s.category || 'siswa') === mode), [allStudents, mode]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [formMode, setFormMode] = useState<StudentFormMode>('create');
  const [draftName, setDraftName] = useState('');
  const [draftBlok, setDraftBlok] = useState<'etan' | 'kulon' | 'lainnya' | ''>('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter blok & huruf untuk kwaru
  const [blokFilter, setBlokFilter] = useState<'semua' | 'etan' | 'kulon' | 'lainnya'>('semua');
  const [hurufFilter, setHurufFilter] = useState<'semua' | 'a-j' | 'k-t' | 'u-z'>('semua');
  const [blokFilterOpen, setBlokFilterOpen] = useState(false);

  const studentsFiltered = useMemo(() => {
    let filtered = students;
    if (isKwaru && blokFilter !== 'semua') {
      filtered = filtered.filter((s) => s.blok === blokFilter);
    }
    if (isKwaru && hurufFilter !== 'semua') {
      filtered = filtered.filter((s) => {
        const first = s.name.charAt(0).toUpperCase();
        if (hurufFilter === 'a-j') return first >= 'A' && first <= 'J';
        if (hurufFilter === 'k-t') return first >= 'K' && first <= 'T';
        if (hurufFilter === 'u-z') return first >= 'U' && first <= 'Z';
        return true;
      });
    }
    return filtered;
  }, [students, blokFilter, hurufFilter]);

  const activeStudent = useMemo(
    () => students.find((student) => student.id === activeStudentId) ?? null,
    [activeStudentId, students],
  );

  const openCreateSheet = () => {
    setFormMode('create');
    setDraftName('');
    setDraftBlok('');
    setErrorMessage('');
    setSheetOpen(true);
  };

  const openEditSheet = (studentId: string) => {
    const student = students.find((item) => item.id === studentId);
    if (!student) {
      return;
    }

    setActiveStudentId(studentId);
    setFormMode('edit');
    setDraftName(student.name);
    setDraftBlok(student.blok === 'etan' || student.blok === 'kulon' || student.blok === 'lainnya' ? student.blok : '');
    setErrorMessage('');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraftName('');
    setDraftBlok('');
    setErrorMessage('');
    setActiveStudentId(null);
  };

  const handleSave = async () => {
    const blokVal = isKwaru ? (draftBlok === '' ? null : draftBlok) : undefined;
    const result = formMode === 'create' ? await addStudent(draftName, mode, blokVal) : activeStudentId ? await updateStudent(activeStudentId, draftName, blokVal) : false;

    if (!result) {
      setErrorMessage(mode === 'guru' ? (isKwaru ? 'Nama ibu-ibu tidak boleh kosong.' : 'Nama guru tidak boleh kosong.') : (isKwaru ? 'Nama jamaah tidak boleh kosong.' : 'Nama siswa tidak boleh kosong.'));
      return;
    }

    closeSheet();
  };

  const handleDelete = () => {
    if (activeStudentId) {
      deleteStudent(activeStudentId);
    }

    setDeleteOpen(false);
    setActiveStudentId(null);
  };

  const handleDeleteAll = async () => {
    setDeleteAllOpen(false);
    await deleteAllStudents();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setImporting(true);
      const rows = await readExcelRows(file);
      const parsed = parseStudentRowsWithBlok(rows);
      const names = parsed.map((p) => p.name);
      const blokMap = new Map(parsed.map((p) => [p.name.toLowerCase(), p.blok]));

      if (names.length === 0) {
        setImportMessage(`Tidak ada nama ditemukan. Pastikan kolom nama terisi (mis. "Nama" atau "${isKwaru ? 'Nama Jamaah' : 'Nama Siswa'}").`);
        return;
      }

      const existingByName = new Map(students.map((s) => [s.name.trim().toLowerCase(), s]));
      const toAdd = names.filter((name) => !existingByName.has(name.trim().toLowerCase()));
      const skipped = names.length - toAdd.length;

      let success = 0;
      let updatedBlok = 0;
      if (isKwaru) {
        for (const parsedRow of parsed) {
          const existingStudent = existingByName.get(parsedRow.name.trim().toLowerCase());
          if (!existingStudent || !parsedRow.blok || existingStudent.blok === parsedRow.blok) {
            continue;
          }
          const ok = await updateStudent(existingStudent.id, existingStudent.name, parsedRow.blok);
          if (ok) {
            updatedBlok += 1;
          }
        }
      }

      for (const name of toAdd) {
        const blok = blokMap.get(name.toLowerCase()) || null;
        const ok = await addStudent(name, mode, blok);
        if (ok) {
          success += 1;
        }
      }

      const failed = toAdd.length - success;
      const parts = [isKwaru ? `${success} jamaah berhasil diimpor.` : `${success} siswa berhasil diimpor.`];
      if (skipped > 0) {
        parts.push(`${skipped} dilewati (sudah ada).`);
      }
      if (updatedBlok > 0) {
        parts.push(`${updatedBlok} blok diperbarui.`);
      }
      if (failed > 0) {
        parts.push(`${failed} gagal disimpan.`);
      }
      setImportMessage(parts.join(' '));
    } catch {
      setImportMessage('Gagal membaca file. Gunakan format .xlsx atau .csv.');
    } finally {
      setImporting(false);
    }
  };

  const pageTitle = isKwaru ? (mode === 'guru' ? 'Ibu-ibu' : 'Jamaah') : (mode === 'guru' ? 'Guru' : 'Siswa');
  const pageDesc = isKwaru ? (mode === 'guru' ? 'Kelola ibu-ibu kelompok waru.' : 'Kelola jamaah kelompok waru.') : (mode === 'guru' ? 'Kelola daftar guru.' : 'Kelola daftar siswa kelas.');
  const totalLabel = isKwaru ? (mode === 'guru' ? 'Total ibu-ibu' : 'Total jamaah') : (mode === 'guru' ? 'Total guru' : 'Total siswa');

  return (
    <PageShell title={pageTitle} description={pageDesc}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{totalLabel}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {isKwaru && (blokFilter !== 'semua' || hurufFilter !== 'semua')
                ? `${studentsFiltered.length} / ${students.length}`
                : students.length}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setImportMessage('');
                setImportOpen(true);
              }}
              className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
            >
              <Upload className="h-4 w-4" strokeWidth={2} />
              Import
            </button>
            <button
              type="button"
              onClick={openCreateSheet}
              className="h-11 rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white"
            >
              + Tambah
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleImportFile}
        />

        {isKwaru && (
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setBlokFilterOpen(!blokFilterOpen)}
                className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                {blokFilter === 'semua' ? 'Semua Blok' : blokFilter === 'etan' ? 'Etan' : blokFilter === 'kulon' ? 'Kulon' : 'Lainnya'}
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {blokFilterOpen && (
                <div className="absolute left-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  {(['semua', 'etan', 'kulon', 'lainnya'] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => { setBlokFilter(b); setBlokFilterOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left text-sm ${blokFilter === b ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'}`}
                    >
                      {b === 'semua' ? 'Semua Blok' : b === 'etan' ? 'Etan' : b === 'kulon' ? 'Kulon' : 'Lainnya'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {(['semua', 'a-j', 'k-t', 'u-z'] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHurufFilter(h)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    hurufFilter === h ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {h === 'semua' ? 'Semua' : h.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {studentsFiltered.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">{isKwaru ? 'Belum ada jamaah. Tap tombol tambah atau import dari Excel.' : 'Belum ada siswa. Tap tombol tambah atau import dari Excel.'}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {studentsFiltered.map((student, index) => (
                <li key={student.id} className={`flex items-center justify-between gap-3 px-4 py-4 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">No. {index + 1}</p>
                    <p className="truncate text-base font-semibold text-slate-900">{student.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => openEditSheet(student.id)}
                      className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStudentId(student.id);
                        setDeleteOpen(true);
                      }}
                      className="h-10 rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700"
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {students.length > 0 && (
          <button
            type="button"
            onClick={() => setDeleteAllOpen(true)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Hapus Semua {mode === 'guru' ? (isKwaru ? 'Ibu-ibu' : 'Guru') : (isKwaru ? 'Jamaah' : 'Siswa')}
          </button>
        )}

        <BottomSheet
          open={sheetOpen}
          title={formMode === 'create' ? (mode === 'guru' ? (isKwaru ? 'Tambah Ibu-ibu' : 'Tambah Guru') : (isKwaru ? 'Tambah Jamaah' : 'Tambah Siswa')) : (mode === 'guru' ? (isKwaru ? 'Edit Ibu-ibu' : 'Edit Guru') : (isKwaru ? 'Edit Jamaah' : 'Edit Siswa'))}
          description={mode === 'guru' ? (isKwaru ? 'Masukkan nama ibu-ibu.' : 'Masukkan nama guru.') : (isKwaru ? 'Masukkan nama jamaah.' : 'Masukkan nama siswa.')}
          onClose={closeSheet}
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{mode === 'guru' ? (isKwaru ? 'Nama ibu-ibu' : 'Nama guru') : (isKwaru ? 'Nama jamaah' : 'Nama siswa')}</span>
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder={mode === 'guru' ? 'Contoh: Pak Budi' : 'Contoh: Alea'}
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

            {isKwaru && (
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Blok</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftBlok('etan')}
                    className={`h-11 rounded-xl text-sm font-semibold transition ${draftBlok === 'etan' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                  >
                    Etan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftBlok('kulon')}
                    className={`h-11 rounded-xl text-sm font-semibold transition ${draftBlok === 'kulon' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                  >
                    Kulon
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftBlok('lainnya')}
                    className={`h-11 rounded-xl text-sm font-semibold transition ${draftBlok === 'lainnya' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                  >
                    Lainnya
                  </button>
                </div>
              </div>
            )}

            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

            <button
              type="button"
              onClick={handleSave}
              className="h-12 w-full rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              Simpan
            </button>
          </div>
        </BottomSheet>

        <BottomSheet
          open={importOpen}
          title={isKwaru ? 'Import Jamaah dari Excel' : 'Import Siswa dari Excel'}
          description={isKwaru ? 'Format: kolom "Nama" (wajib) + kolom "Blok" (isi "Etan" atau "Kulon"). Contoh: Nama=Budi, Blok=Etan.' : 'Pilih file .xlsx atau .csv dengan kolom Nama.'}
          onClose={() => setImportOpen(false)}
        >
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <Upload className="h-5 w-5" strokeWidth={2} />
              {importing ? 'Mengimpor...' : 'Pilih File Excel'}
            </button>

            <a
              href="/template-siswa.xlsx"
              download
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white"
            >
              <Download className="h-5 w-5" strokeWidth={2} />
              Unduh Template
            </a>

            {importMessage ? <p className="text-sm text-slate-600">{importMessage}</p> : null}
          </div>
        </BottomSheet>

        <ConfirmDialog
          open={deleteOpen}
          title={isKwaru ? 'Hapus jamaah' : 'Hapus siswa'}
          description={`Hapus ${activeStudent?.name ?? (isKwaru ? 'jamaah ini' : 'siswa ini')}? ${isKwaru ? 'Data sodaqoh jamaah ini juga akan terhapus.' : 'Data kas siswa ini juga akan terhapus.'}`}
          confirmLabel="Hapus"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />

        <ConfirmDialog
          open={deleteAllOpen}
          title={isKwaru ? 'Hapus semua jamaah' : 'Hapus semua siswa'}
          description={`Hapus semua ${students.length} ${isKwaru ? 'jamaah beserta data sodaqohnya' : 'siswa beserta data kasnya'}? Tindakan ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus Semua"
          destructive
          onConfirm={() => void handleDeleteAll()}
          onCancel={() => setDeleteAllOpen(false)}
        />
      </div>
    </PageShell>
  );
}
