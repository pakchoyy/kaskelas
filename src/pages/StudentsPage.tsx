import { useMemo, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { extractStudentNames, readExcelRows } from '../lib/excel';

type StudentFormMode = 'create' | 'edit';

export function StudentsPage() {
  const { students, addStudent, updateStudent, deleteStudent } = useAppData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState<StudentFormMode>('create');
  const [draftName, setDraftName] = useState('');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStudent = useMemo(
    () => students.find((student) => student.id === activeStudentId) ?? null,
    [activeStudentId, students],
  );

  const openCreateSheet = () => {
    setFormMode('create');
    setDraftName('');
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
    setErrorMessage('');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDraftName('');
    setErrorMessage('');
    setActiveStudentId(null);
  };

  const handleSave = () => {
    const result = formMode === 'create' ? addStudent(draftName) : activeStudentId ? updateStudent(activeStudentId, draftName) : false;

    if (!result) {
      setErrorMessage('Nama siswa tidak boleh kosong.');
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

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const rows = await readExcelRows(file);
      const names = extractStudentNames(rows);

      if (names.length === 0) {
        setImportMessage('Tidak ada nama ditemukan. Pastikan kolom "Nama" terisi.');
        return;
      }

      names.forEach((name) => addStudent(name));
      setImportMessage(`${names.length} siswa berhasil diimpor.`);
    } catch {
      setImportMessage('Gagal membaca file. Gunakan format .xlsx atau .csv.');
    }
  };

  return (
    <PageShell title="Siswa" description="Kelola daftar siswa kelas.">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Total siswa</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{students.length}</p>
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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada siswa. Tap tombol tambah atau import dari Excel.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((student, index) => (
                <li key={student.id} className="flex items-center justify-between gap-3 px-4 py-4">
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

        <BottomSheet
          open={sheetOpen}
          title={formMode === 'create' ? 'Tambah Siswa' : 'Edit Siswa'}
          description="Masukkan nama siswa."
          onClose={closeSheet}
        >
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Nama siswa</span>
              <input
                autoFocus
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Contoh: Alea"
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
              />
            </label>

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
          title="Import Siswa dari Excel"
          description="Pilih file .xlsx atau .csv dengan kolom Nama."
          onClose={() => setImportOpen(false)}
        >
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              <Upload className="h-5 w-5" strokeWidth={2} />
              Pilih File Excel
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
          title="Hapus siswa"
          description={`Hapus ${activeStudent?.name ?? 'siswa ini'}? Data kas siswa ini juga akan terhapus.`}
          confirmLabel="Hapus"
          destructive
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      </div>
    </PageShell>
  );
}
