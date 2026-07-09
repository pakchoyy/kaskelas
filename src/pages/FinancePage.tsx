import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageShell } from '../components/PageShell';
import { useAppData } from '../hooks/useAppData';
import { useAppSettings } from '../hooks/useAppSettings';
import { extractFinanceRows, readExcelRows } from '../lib/excel';
import { formatCurrency } from '../lib/format';
import { formatShortDisplayDate, todayIsoDate } from '../lib/date';

type FinanceTab = 'Pengeluaran' | 'Pemasukan';

type FinanceFormMode = 'create' | 'edit';

export function FinancePage() {
  const {
    financeRecords,
    addFinanceTransaction,
    updateFinanceTransaction,
    deleteFinanceTransaction,
  } = useAppData();
  const { settings } = useAppSettings();
  const [activeTab, setActiveTab] = useState<FinanceTab>('Pengeluaran');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState<FinanceFormMode>('create');
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<FinanceTab>('Pengeluaran');
  const [draftDate, setDraftDate] = useState(todayIsoDate());
  const [draftNominal, setDraftNominal] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    return financeRecords
      .filter((transaction) => transaction.type === activeTab)
      .sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt));
  }, [activeTab, financeRecords]);

  const activeTransaction = useMemo(
    () => financeRecords.find((transaction) => transaction.id === activeTransactionId) ?? null,
    [activeTransactionId, financeRecords],
  );

  const totals = useMemo(() => {
    const pemasukanLain = financeRecords
      .filter((transaction) => transaction.type === 'Pemasukan')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);

    const pengeluaran = financeRecords
      .filter((transaction) => transaction.type === 'Pengeluaran')
      .reduce((sum, transaction) => sum + transaction.nominal, 0);

    return { pemasukanLain, pengeluaran };
  }, [financeRecords]);

  const openCreateSheet = () => {
    setFormMode('create');
    setDraftType(activeTab);
    setDraftDate(todayIsoDate());
    setDraftNominal('');
    setDraftNote('');
    setErrorMessage('');
    setSheetOpen(true);
  };

  const openEditSheet = (transactionId: string) => {
    const transaction = financeRecords.find((item) => item.id === transactionId);
    if (!transaction) {
      return;
    }

    setActiveTransactionId(transactionId);
    setFormMode('edit');
    setDraftType(transaction.type);
    setDraftDate(transaction.date);
    setDraftNominal(String(transaction.nominal));
    setDraftNote(transaction.note);
    setErrorMessage('');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setActiveTransactionId(null);
    setErrorMessage('');
  };

  const handleSave = () => {
    const nominal = Number(draftNominal);
    const result =
      formMode === 'create'
        ? addFinanceTransaction(draftType, draftDate, nominal, draftNote)
        : activeTransactionId
          ? updateFinanceTransaction(activeTransactionId, draftType, draftDate, nominal, draftNote)
          : false;

    if (!result) {
      setErrorMessage('Nominal harus diisi dan keterangan tidak boleh kosong.');
      return;
    }

    closeSheet();
  };

  const handleDelete = () => {
    if (activeTransactionId) {
      deleteFinanceTransaction(activeTransactionId);
    }

    setDeleteOpen(false);
    setActiveTransactionId(null);
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      const rows = await readExcelRows(file);
      const parsed = extractFinanceRows(rows);

      if (parsed.length === 0) {
        setImportMessage('Tidak ada baris valid. Pastikan kolom Tanggal, Tipe, Nominal, Keterangan terisi.');
        return;
      }

      parsed.forEach((row) => addFinanceTransaction(row.type, row.date, row.nominal, row.note));
      setImportMessage(`${parsed.length} transaksi berhasil diimpor.`);
    } catch {
      setImportMessage('Gagal membaca file. Gunakan format .xlsx atau .csv.');
    }
  };

  return (
    <PageShell
      title="Keuangan"
      description="Catat pemasukan lain dan pengeluaran kelas."
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-700">Pemasukan Lain</p>
              <p className="mt-2 text-xl font-semibold text-brand-800">{formatCurrency(totals.pemasukanLain)}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-rose-700">Pengeluaran</p>
              <p className="mt-2 text-xl font-semibold text-rose-700">{formatCurrency(totals.pengeluaran)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
            {(['Pengeluaran', 'Pemasukan'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-11 rounded-2xl text-sm font-semibold transition ${
                  activeTab === tab ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Daftar transaksi</p>
              <p className="mt-1 text-sm text-slate-500">Tab aktif: {activeTab}</p>
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
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          {filteredRecords.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Belum ada transaksi {activeTab.toLowerCase()}.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredRecords.map((transaction) => (
                <li key={transaction.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">{transaction.note}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatShortDisplayDate(transaction.date)}
                        {settings.className ? ` • ${settings.className}` : ''}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        transaction.type === 'Pemasukan' ? 'text-brand-700' : 'text-rose-700'
                      }`}
                    >
                      {transaction.type === 'Pemasukan' ? '+' : '-'}{formatCurrency(transaction.nominal)}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditSheet(transaction.id)}
                      className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTransactionId(transaction.id);
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
      </div>

      <BottomSheet
        open={sheetOpen}
        title={formMode === 'create' ? 'Tambah Transaksi' : 'Edit Transaksi'}
        description="Gunakan format ini untuk pengeluaran dan pemasukan lain."
        onClose={closeSheet}
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Tipe</span>
            <select
              value={draftType}
              onChange={(event) => setDraftType(event.target.value as FinanceTab)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
            >
              <option value="Pengeluaran">Pengeluaran</option>
              <option value="Pemasukan">Pemasukan Lain</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Tanggal</span>
            <input
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Nominal</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={draftNominal}
              onChange={(event) => setDraftNominal(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Keterangan</span>
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={3}
              placeholder="Contoh: Beli spidol kelas"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none ring-brand-200 focus:border-brand-500 focus:ring-4"
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

      <ConfirmDialog
        open={deleteOpen}
        title="Hapus transaksi"
        description={`Hapus transaksi ${activeTransaction?.note ?? 'ini'}? Data akan dihapus.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleImportFile}
      />

      <BottomSheet
        open={importOpen}
        title="Import Transaksi dari Excel"
        description="File .xlsx atau .csv dengan kolom Tanggal, Tipe, Nominal, Keterangan."
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

          {importMessage ? <p className="text-sm text-slate-600">{importMessage}</p> : null}
        </div>
      </BottomSheet>
    </PageShell>
  );
}
