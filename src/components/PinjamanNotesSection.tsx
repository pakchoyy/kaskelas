import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { formatCurrency } from '../lib/format';
import type { Note, PinjamanDetails } from '../services/api';

type PinjamanNotesSectionProps = {
  notes: Note[];
  loading?: boolean;
  onAdd: (text: string, details: PinjamanDetails) => Promise<boolean>;
  onToggleLunas: (note: Note, lunas: boolean) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
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

function parseNominal(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0;
}

export function PinjamanNotesSection({ notes, loading = false, onAdd, onToggleLunas, onDelete }: PinjamanNotesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [tgl, setTgl] = useState(todayIso);
  const [nominal, setNominal] = useState('');
  const [dari, setDari] = useState('');
  const [perlu, setPerlu] = useState('');
  const [errors, setErrors] = useState({ nominal: '', dari: '', perlu: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const items = notes.filter((n) => n.details);
  const belum = items.reduce((sum, n) => (n.details?.lunas ? sum : sum + (n.details?.nom ?? 0)), 0);
  const deletingNote = items.find((n) => n.id === deleteId);

  const resetForm = () => {
    setTgl(todayIso());
    setNominal('');
    setDari('');
    setPerlu('');
    setErrors({ nominal: '', dari: '', perlu: '' });
  };

  const handleSave = async () => {
    if (saving) return;
    const nom = parseNominal(nominal);
    const namaDari = dari.trim();
    const keperluan = perlu.trim();
    const next = {
      nominal: nom ? '' : 'Isi nominal',
      dari: namaDari ? '' : 'Isi nama pemberi pinjaman',
      perlu: keperluan ? '' : 'Isi keperluan',
    };
    setErrors(next);
    if (next.nominal || next.dari || next.perlu) return;

    setSaving(true);
    const details: PinjamanDetails = { tgl: tgl || todayIso(), nom, dari: namaDari, perlu: keperluan, lunas: false };
    const ok = await onAdd(`Pinjam ${formatCurrency(nom)} dari ${namaDari}: ${keperluan}`, details);
    setSaving(false);
    if (ok) {
      resetForm();
      setFormOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || deleting) return;
    setDeleting(true);
    await onDelete(deleteId);
    setDeleteId(null);
    setDeleting(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catatan</p>
          <p className="mt-1 text-xs text-slate-400">Hanya catatan pribadi. Tidak memengaruhi saldo dan rekap.</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Tambah catatan
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="pinjaman-tgl">Tanggal</label>
            <input id="pinjaman-tgl" type="date" className={inputClass} value={tgl} onChange={(e) => setTgl(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="pinjaman-nom">Nominal</label>
            <input
              id="pinjaman-nom"
              type="text"
              inputMode="numeric"
              placeholder="500.000"
              className={inputClass}
              value={nominal}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '');
                setNominal(d ? Number(d).toLocaleString('id-ID') : '');
                setErrors((prev) => ({ ...prev, nominal: '' }));
              }}
            />
            {errors.nominal && <p className="mt-1 text-xs text-rose-600">{errors.nominal}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="pinjaman-dari">Pinjam dari</label>
            <input
              id="pinjaman-dari"
              type="text"
              placeholder="Bu Ika"
              className={inputClass}
              value={dari}
              onChange={(e) => {
                setDari(e.target.value);
                setErrors((prev) => ({ ...prev, dari: '' }));
              }}
            />
            {errors.dari && <p className="mt-1 text-xs text-rose-600">{errors.dari}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor="pinjaman-perlu">Keperluan</label>
            <input
              id="pinjaman-perlu"
              type="text"
              placeholder="Beli spidol kelas"
              className={inputClass}
              value={perlu}
              onChange={(e) => {
                setPerlu(e.target.value);
                setErrors((prev) => ({ ...prev, perlu: '' }));
              }}
            />
            {errors.perlu && <p className="mt-1 text-xs text-rose-600">{errors.perlu}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setFormOpen(false);
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
              {saving ? 'Menyimpan...' : 'Simpan catatan'}
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && belum > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-3 text-sm font-semibold text-brand-700">
          <span>Belum dikembalikan</span>
          <span>{formatCurrency(belum)}</span>
        </div>
      )}

      <div className="mt-4 grid gap-2.5">
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">Belum ada catatan.</p>}
        {items.map((note) => {
          const d = note.details!;
          return (
            <div
              key={note.id}
              className={`rounded-xl border border-slate-200 p-3 ${d.lunas ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-bold text-slate-900">
                  {formatCurrency(d.nom)} dari {d.dari}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    d.lunas ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-50 text-brand-700'
                  }`}
                >
                  {d.lunas ? 'Sudah dikembalikan' : 'Belum'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatTanggal(d.tgl)} · {d.perlu}
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLunas(note, !d.lunas)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                >
                  {d.lunas ? 'Tandai belum' : 'Tandai sudah dikembalikan'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(note.id)}
                  aria-label="Hapus catatan"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus catatan"
        description={deletingNote ? `Hapus catatan pinjaman dari ${deletingNote.details?.dari}?` : 'Hapus catatan ini?'}
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
