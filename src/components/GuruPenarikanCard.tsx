import { useState } from 'react';
import { Minus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { formatCurrency } from '../lib/format';
import type { Contribution } from '../services/api';

type GuruPenarikanCardProps = {
  title: string;
  gurus: Array<{ id: string; name: string }>;
  records: Contribution[];
  loading: boolean;
  error: string | null;
  onAdd: (studentId: string, nominal: number, date: string, note: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-base text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500';

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function GuruPenarikanCard({ title, gurus, records, loading, error, onAdd, onRemove }: GuruPenarikanCardProps) {
  const [open, setOpen] = useState(false);
  const [guruId, setGuruId] = useState('');
  const [tgl, setTgl] = useState(todayIso);
  const [nominal, setNominal] = useState('');
  const [perlu, setPerlu] = useState('');
  const [errors, setErrors] = useState({ guru: '', nominal: '', perlu: '' });
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nameById = new Map(gurus.map((g) => [g.id, g.name]));
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const totalTarik = records.reduce((sum, r) => sum + r.nominal, 0);

  const reset = () => {
    setGuruId('');
    setTgl(todayIso());
    setNominal('');
    setPerlu('');
    setErrors({ guru: '', nominal: '', perlu: '' });
    setFailed(false);
  };

  const handleSave = async () => {
    if (saving) return;
    const nom = Number(nominal.replace(/\D/g, '')) || 0;
    const next = {
      guru: guruId ? '' : 'Pilih guru',
      nominal: nom ? '' : 'Isi nominal',
      perlu: perlu.trim() ? '' : 'Isi keperluan',
    };
    setErrors(next);
    setFailed(false);
    if (next.guru || next.nominal || next.perlu) return;

    setSaving(true);
    const ok = await onAdd(guruId, nom, tgl || todayIso(), perlu.trim());
    setSaving(false);
    if (ok) {
      reset();
      setOpen(false);
    } else {
      setFailed(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    await onRemove(deleteId);
    setDeleteId(null);
    setDeleting(false);
  };

  const deleting_record = records.find((r) => r.id === deleteId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">Mengurangi tabungan guru di Rekap.</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
            Catat penarikan
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Guru</label>
            <select
              className={inputClass}
              value={guruId}
              onChange={(e) => {
                setGuruId(e.target.value);
                setErrors((p) => ({ ...p, guru: '' }));
              }}
            >
              <option value="">Pilih guru</option>
              {gurus.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            {errors.guru && <p className="mt-1 text-xs text-rose-600">{errors.guru}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal</label>
            <input type="date" className={inputClass} value={tgl} onChange={(e) => setTgl(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Nominal ditarik</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="100.000"
              className={inputClass}
              value={nominal}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '');
                setNominal(d ? Number(d).toLocaleString('id-ID') : '');
                setErrors((p) => ({ ...p, nominal: '' }));
              }}
            />
            {errors.nominal && <p className="mt-1 text-xs text-rose-600">{errors.nominal}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Keperluan</label>
            <input
              type="text"
              placeholder="Untuk keperluan apa"
              className={inputClass}
              value={perlu}
              onChange={(e) => {
                setPerlu(e.target.value);
                setErrors((p) => ({ ...p, perlu: '' }));
              }}
            />
            {errors.perlu && <p className="mt-1 text-xs text-rose-600">{errors.perlu}</p>}
          </div>
          {failed && <p className="text-xs text-rose-600">{error || 'Gagal menyimpan penarikan'}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-11 flex-[2] rounded-xl bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan penarikan'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-xs text-slate-400">Memuat...</p>
      ) : sorted.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">Belum ada penarikan.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-700">
            <span>Total ditarik</span>
            <span>−{formatCurrency(totalTarik)}</span>
          </div>
          <ul className="mt-2 divide-y divide-slate-100">
            {sorted.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {nameById.get(r.studentId) ?? 'Guru'} · <span className="text-rose-600">−{formatCurrency(r.nominal)}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {formatTanggal(r.date)}{r.note ? ` · ${r.note}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteId(r.id)}
                  aria-label="Hapus penarikan"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus penarikan"
        description={
          deleting_record
            ? `Hapus penarikan ${formatCurrency(deleting_record.nominal)} oleh ${nameById.get(deleting_record.studentId) ?? 'guru'}? Tabungannya akan bertambah lagi.`
            : 'Hapus penarikan ini?'
        }
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
