import { useState } from 'react';
import { Save, Edit2, Trash2, X, Check } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import type { Note } from '../services/api';

type NotesSectionProps = {
  notes: Note[];
  loading?: boolean;
  onAdd: (text: string) => Promise<boolean>;
  onUpdate: (id: string, text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

export function NotesSection({
  notes,
  loading = false,
  onAdd,
  onUpdate,
  onDelete,
}: NotesSectionProps) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async () => {
    const text = draft.trim();
    if (!text || adding) {
      return;
    }
    setAdding(true);
    const ok = await onAdd(text);
    if (ok) {
      setDraft('');
    }
    setAdding(false);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingText(note.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleEditSave = async () => {
    if (!editingId || savingEdit) {
      return;
    }
    const text = editingText.trim();
    if (!text) {
      return;
    }
    setSavingEdit(true);
    const ok = await onUpdate(editingId, text);
    if (ok) {
      cancelEdit();
    }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    if (!deleteId || deleting) {
      return;
    }
    setDeleting(true);
    await onDelete(deleteId);
    setDeleteId(null);
    setDeleting(false);
  };

  const deletingNote = notes.find((n) => n.id === deleteId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Catatan</p>

      {notes.length === 0 && !loading ? (
        <p className="mt-2 text-xs text-slate-400">Belum ada catatan untuk periode ini.</p>
      ) : null}

      {notes.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center justify-between gap-2 py-2">
              {editingId === note.id ? (
                <div className="flex w-full items-center gap-2">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={savingEdit}
                    aria-label="Simpan catatan"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    aria-label="Batal edit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
                  >
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <>
                  <p className="min-w-0 flex-1 text-sm text-slate-700">{note.text}</p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(note)}
                      aria-label="Edit catatan"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Edit2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(note.id)}
                      aria-label="Hapus catatan"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {editingId === null && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="Tulis catatan..."
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !draft.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            Simpan
          </button>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Hapus catatan"
        description={deletingNote ? `Hapus catatan "${deletingNote.text}"?` : 'Hapus catatan ini?'}
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}