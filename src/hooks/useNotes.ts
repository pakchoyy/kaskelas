import { useState, useCallback, useEffect, useRef } from 'react';
import { notesApi, type Note } from '../services/api';

export function useNotes(scope: string, periodKey: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const requestSeq = useRef(0);

  const loadNotes = useCallback(async () => {
    const seq = ++requestSeq.current;
    try {
      setLoading(true);
      const data = await notesApi.getAll({ scope, periodKey });
      if (seq === requestSeq.current) {
        setNotes(data);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
      }
    }
  }, [scope, periodKey]);

  useEffect(() => {
    setNotes([]);
    setLoading(false);
    loadNotes();
  }, [loadNotes]);

  const addNote = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) {
        return false;
      }
      try {
        const note = await notesApi.create({ scope, periodKey, text: trimmed });
        setNotes(current => [...current, note]);
        return true;
      } catch (err) {
        console.error('Failed to add note:', err);
        return false;
      }
    },
    [scope, periodKey],
  );

  const updateNote = useCallback(async (id: string, text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }
    try {
      const updated = await notesApi.update(id, { text: trimmed });
      setNotes(current => current.map(n => (n.id === id ? updated : n)));
      return true;
    } catch (err) {
      console.error('Failed to update note:', err);
      return false;
    }
  }, []);

  const removeNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      await notesApi.delete(id);
      setNotes(current => current.filter(n => n.id !== id));
      return true;
    } catch (err) {
      console.error('Failed to delete note:', err);
      return false;
    }
  }, []);

  return {
    notes,
    loading,
    loadNotes,
    addNote,
    updateNote,
    removeNote,
  };
}