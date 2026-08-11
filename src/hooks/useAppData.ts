import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  studentsApi,
  contributionsApi,
  financeApi,
  type Student,
  type Contribution,
  type FinanceTransaction as ApiFinanceTransaction,
  type ContributionType,
} from '../services/api';
import { dispatchAppEvent, APP_DATA_UPDATED_EVENT } from '../lib/events';
import { mapFinanceTypeFromApi, mapFinanceTypeToApi } from '../lib/apiHelpers';

// Frontend types for backward compatibility
export type FinanceTransaction = {
  id: string;
  type: 'Pemasukan' | 'Pengeluaran';
  date: string;
  nominal: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

// Legacy types for backward compatibility
export type CashDateRecord = {
  date: string;
  checkedStudentIds: string[];
  updatedAt: string;
};

export function useAppData() {
  const [students, setStudents] = useState<Student[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [apiFinanceRecords, setApiFinanceRecords] = useState<ApiFinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map API finance records to frontend format
  const financeRecords = useMemo<FinanceTransaction[]>(() => {
    return apiFinanceRecords.map(record => ({
      ...record,
      type: mapFinanceTypeFromApi(record.type),
    }));
  }, [apiFinanceRecords]);

  // Transform contributions to cashRecords format for backward compatibility
  const cashRecords = useMemo(() => {
    const records: Record<string, CashDateRecord> = {};
    
    contributions
      .filter(c => c.contributionType === 'kas_kelas')
      .forEach(c => {
        if (!records[c.date]) {
          records[c.date] = {
            date: c.date,
            checkedStudentIds: [],
            updatedAt: c.updatedAt,
          };
        }
        records[c.date].checkedStudentIds.push(c.studentId);
        // Update to latest timestamp
        if (c.updatedAt > records[c.date].updatedAt) {
          records[c.date].updatedAt = c.updatedAt;
        }
      });
    
    return records;
  }, [contributions]);

  // Load data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [studentsData, contributionsData, financeData] = await Promise.all([
        studentsApi.getAll(),
        contributionsApi.getAll(),
        financeApi.getAll(),
      ]);
      
      setStudents(studentsData);
      setContributions(contributionsData);
      setApiFinanceRecords(financeData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Student operations
  const addStudent = useCallback(async (name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }

    try {
      const newStudent = await studentsApi.create(trimmedName);
      setStudents(current => [...current, newStudent]);
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
      return true;
    } catch (err) {
      console.error('Failed to add student:', err);
      setError(err instanceof Error ? err.message : 'Failed to add student');
      return false;
    }
  }, []);

  const updateStudent = useCallback(async (studentId: string, name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }

    try {
      const updated = await studentsApi.update(studentId, trimmedName);
      setStudents(current =>
        current.map(s => (s.id === studentId ? updated : s))
      );
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
      return true;
    } catch (err) {
      console.error('Failed to update student:', err);
      setError(err instanceof Error ? err.message : 'Failed to update student');
      return false;
    }
  }, []);

  const deleteStudent = useCallback(async (studentId: string): Promise<void> => {
    try {
      await studentsApi.delete(studentId);
      setStudents(current => current.filter(s => s.id !== studentId));
      // Remove related contributions
      setContributions(current => current.filter(c => c.studentId !== studentId));
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    } catch (err) {
      console.error('Failed to delete student:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete student');
    }
  }, []);

  const deleteAllStudents = useCallback(async (): Promise<void> => {
    try {
      for (const student of students) {
        await studentsApi.delete(student.id);
      }
      setStudents([]);
      setContributions(current => current.filter(c => !students.some(s => s.id === c.studentId)));
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    } catch (err) {
      console.error('Failed to delete all students:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete all students');
    }
  }, [students]);

  // Contribution operations
  const setCheckedStudents = useCallback(async (date: string, checkedStudentIds: string[]): Promise<void> => {
    // Get existing contributions for this date from current state
    const existingForDate = contributions.filter(
      c => c.date === date && c.contributionType === 'kas_kelas'
    );
    
    // Determine which to add and which to remove
    const toAdd = checkedStudentIds.filter(
      sid => !existingForDate.some(c => c.studentId === sid)
    );
    const toRemove = existingForDate.filter(
      c => !checkedStudentIds.includes(c.studentId)
    );

    // If nothing to change, return early
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }

    // Optimistic update: update UI immediately with temp IDs
    const tempContributions = toAdd.map(studentId => ({
      id: `temp-${date}-${studentId}`,
      studentId,
      contributionType: 'kas_kelas' as const,
      date,
      nominal: 2000,
      periodMonth: null,
      periodYear: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setContributions(current => {
      // Remove items to be deleted
      let next = current.filter(c => !toRemove.some(r => r.id === c.id));
      // Add temp contributions
      next = [...next, ...tempContributions];
      return next;
    });

    // Background: save to API and reload
    try {
      const settings = await import('../services/api').then(m => m.settingsApi.getAll());
      const kasKelasSettings = settings.find(s => s.contributionType === 'kas_kelas');
      const defaultNominal = kasKelasSettings?.defaultNominal || 2000;

      // Execute adds and removes in parallel
      await Promise.all([
        ...toAdd.map(studentId =>
          contributionsApi.create({
            studentId,
            contributionType: 'kas_kelas',
            date,
            nominal: defaultNominal,
          })
        ),
        ...toRemove.map(c => contributionsApi.delete(c.id)),
      ]);

      // Reload all contributions from API to ensure consistency
      const allContributions = await contributionsApi.getAll();
      setContributions(allContributions);

      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    } catch (err) {
      console.error('Failed to set checked students:', err);
      setError(err instanceof Error ? err.message : 'Failed to save contributions');
      
      // Rollback: remove temp items and restore removed items
      setContributions(current => {
        let next = current.filter(c => !tempContributions.some(t => t.id === c.id));
        next = [...next, ...toRemove];
        return next;
      });
    }
  }, [contributions]);

  const toggleStudentOnDate = useCallback(async (date: string, studentId: string): Promise<void> => {
    const existingForDate = contributions.filter(
      c => c.date === date && c.contributionType === 'kas_kelas'
    );
    const existing = existingForDate.find(c => c.studentId === studentId);

    if (existing) {
      // Remove
      try {
        await contributionsApi.delete(existing.id);
        setContributions(current => current.filter(c => c.id !== existing.id));
        dispatchAppEvent(APP_DATA_UPDATED_EVENT);
      } catch (err) {
        console.error('Failed to toggle student:', err);
        setError(err instanceof Error ? err.message : 'Failed to update contribution');
      }
    } else {
      // Add
      try {
        const settings = await import('../services/api').then(m => m.settingsApi.getAll());
        const kasKelasSettings = settings.find(s => s.contributionType === 'kas_kelas');
        const defaultNominal = kasKelasSettings?.defaultNominal || 2000;

        const newContribution = await contributionsApi.create({
          studentId,
          contributionType: 'kas_kelas',
          date,
          nominal: defaultNominal,
        });

        setContributions(current => [...current, newContribution]);
        dispatchAppEvent(APP_DATA_UPDATED_EVENT);
      } catch (err) {
        console.error('Failed to toggle student:', err);
        setError(err instanceof Error ? err.message : 'Failed to add contribution');
      }
    }
  }, [contributions]);

  // Finance operations
  const addFinanceTransaction = useCallback(
    async (type: string, date: string, nominal: number, note: string): Promise<boolean> => {
      const trimmedNote = note.trim();
      if (!trimmedNote || nominal <= 0) {
        return false;
      }

      try {
        const apiType = type === 'Pemasukan' ? 'pemasukan' : 'pengeluaran';
      const newTransaction = await financeApi.create({
        type: apiType,
        date,
        nominal,
        note: trimmedNote,
      });

      setApiFinanceRecords(current => [...current, newTransaction]);
        dispatchAppEvent(APP_DATA_UPDATED_EVENT);
        return true;
      } catch (err) {
        console.error('Failed to add finance transaction:', err);
        setError(err instanceof Error ? err.message : 'Failed to add transaction');
        return false;
      }
    },
    []
  );

  const updateFinanceTransaction = useCallback(
    async (
      transactionId: string,
      type: string,
      date: string,
      nominal: number,
      note: string
    ): Promise<boolean> => {
      const trimmedNote = note.trim();
      if (!trimmedNote || nominal <= 0) {
        return false;
      }

      try {
        const apiType = type === 'Pemasukan' ? 'pemasukan' : 'pengeluaran';
        const updated = await financeApi.update(transactionId, {
          type: apiType,
          date,
          nominal,
          note: trimmedNote,
        });

        setApiFinanceRecords(current =>
          current.map(t => (t.id === transactionId ? updated : t))
        );
        dispatchAppEvent(APP_DATA_UPDATED_EVENT);
        return true;
      } catch (err) {
        console.error('Failed to update finance transaction:', err);
        setError(err instanceof Error ? err.message : 'Failed to update transaction');
        return false;
      }
    },
    []
  );

  const deleteFinanceTransaction = useCallback(async (transactionId: string): Promise<void> => {
    try {
      await financeApi.delete(transactionId);
      setApiFinanceRecords(current => current.filter(t => t.id !== transactionId));
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    } catch (err) {
      console.error('Failed to delete finance transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  }, []);

  // Legacy compatibility functions
  const refreshFromStorage = useCallback(() => {
    // No-op for API version, kept for compatibility
    console.warn('refreshFromStorage is deprecated with API backend');
  }, []);

  const refreshFromSpreadsheet = useCallback(async (): Promise<boolean> => {
    // Redirect to API reload
    await loadData();
    return !error;
  }, [loadData, error]);

  const saveCurrentState = useCallback(() => {
    // No-op for API version (auto-saved), kept for compatibility
    console.warn('saveCurrentState is deprecated with API backend (auto-saved)');
  }, []);

  return {
    students,
    cashRecords,
    financeRecords,
    contributions, // Expose raw contributions for new code
    loading,
    error,
    refreshFromStorage,
    refreshFromSpreadsheet,
    addStudent,
    updateStudent,
    deleteStudent,
    deleteAllStudents,
    setCheckedStudents,
    toggleStudentOnDate,
    saveCurrentState,
    addFinanceTransaction,
    updateFinanceTransaction,
    deleteFinanceTransaction,
    reload: loadData, // New: explicit reload function
  };
}
