import { useState, useCallback, useEffect, useRef } from 'react';
import { contributionsApi, settingsApi, type Contribution, type ContributionType } from '../services/api';
import { mapContributionTypeToApi } from '../lib/apiHelpers';

type FrontendContributionType = 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji' | 'tabungan' | 'lks';

export function useContributions(
  contributionType: FrontendContributionType,
  dateOrPeriod: { date?: string; periodMonth?: number; periodYear?: number }
) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultNominal, setDefaultNominal] = useState<number | null>(null);

  const apiType = mapContributionTypeToApi(contributionType);

  const requestSeq = useRef(0);
  const loadingRef = useRef(true);

  // Load contributions
  const loadContributions = useCallback(async () => {
    const seq = ++requestSeq.current;
    loadingRef.current = true;
    try {
      setLoading(true);
      setError(null);

      const filters: any = { contributionType: apiType };
      
      if (dateOrPeriod.date) {
        filters.date = dateOrPeriod.date;
      }
      
      if (dateOrPeriod.periodMonth !== undefined) {
        filters.periodMonth = dateOrPeriod.periodMonth;
      }
      
      if (dateOrPeriod.periodYear !== undefined) {
        filters.periodYear = dateOrPeriod.periodYear;
      }

      const data = await contributionsApi.getAll(filters);
      if (seq === requestSeq.current) {
        setContributions(data);
      }
    } catch (err) {
      if (seq === requestSeq.current) {
        const message = err instanceof Error ? err.message : 'Failed to load contributions';
        setError(message);
        console.error('Failed to load contributions:', err);
      }
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [apiType, dateOrPeriod.date, dateOrPeriod.periodMonth, dateOrPeriod.periodYear]);

  // Load default nominal
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsApi.getAll();
        const setting = settings.find(s => s.contributionType === apiType);
        setDefaultNominal(setting?.defaultNominal || null);
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    
    loadSettings();
  }, [apiType]);

  // Initial load and reset on context change
  useEffect(() => {
    // Reset contributions immediately when context changes to prevent stale data
    setContributions([]);
    setError(null);
    loadContributions();
  }, [loadContributions]);

  // Add contribution
  const addContribution = useCallback(
    async (studentId: string, nominal: number, date?: string, periodMonth?: number, periodYear?: number, note?: string | null): Promise<boolean> => {
      // Prevent action while loading to avoid race condition
      if (loadingRef.current) {
        console.warn('Still loading, preventing add contribution');
        return false;
      }

      try {
        const data: any = {
          studentId,
          contributionType: apiType,
          date: date || dateOrPeriod.date || new Date().toISOString().split('T')[0],
          nominal,
        };

        if ((apiType as string) === 'paguyuban_ngaji' || (apiType as string) === 'lks' || (apiType as string) === 'tabungan_guru_bulanan' || (apiType as string) === 'tabungan_guru_tw') {
          data.periodMonth = periodMonth ?? dateOrPeriod.periodMonth;
          data.periodYear = periodYear ?? dateOrPeriod.periodYear;
        }

        if (note !== undefined) {
          data.note = note;
        }

        const newContribution = await contributionsApi.create(data);
        setContributions(current => [...current, newContribution]);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add contribution';
        setError(message);
        console.error('Failed to add contribution:', err);
        return false;
      }
    },
    [apiType, dateOrPeriod.date, dateOrPeriod.periodMonth, dateOrPeriod.periodYear]
  );

  // Update contribution
  const updateContribution = useCallback(
    async (contributionId: string, data: { nominal?: number; date?: string; note?: string | null }): Promise<boolean> => {
      // Prevent action while loading to avoid race condition
      if (loadingRef.current) {
        console.warn('Still loading, preventing update contribution');
        return false;
      }

      try {
        const updated = await contributionsApi.update(contributionId, data);
        setContributions(current =>
          current.map(c => (c.id === contributionId ? updated : c))
        );
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update contribution';
        setError(message);
        console.error('Failed to update contribution:', err);
        return false;
      }
    },
    []
  );

  // Remove contribution
  const removeContribution = useCallback(async (contributionId: string): Promise<boolean> => {
    // Prevent action while loading to avoid race condition
    if (loadingRef.current) {
      console.warn('Still loading, preventing remove contribution');
      return false;
    }

    try {
      await contributionsApi.delete(contributionId);
      setContributions(current => current.filter(c => c.id !== contributionId));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove contribution';
      setError(message);
      console.error('Failed to remove contribution:', err);
      return false;
    }
  }, []);

  // Toggle student contribution
  const toggleStudent = useCallback(
    async (studentId: string, nominal: number): Promise<void> => {
      const existing = contributions.find(c => c.studentId === studentId);
      
      if (existing) {
        await removeContribution(existing.id);
      } else {
        await addContribution(studentId, nominal);
      }
    },
    [contributions, addContribution, removeContribution]
  );

  // Check if student has paid
  const hasStudentPaid = useCallback(
    (studentId: string): boolean => {
      return contributions.some(c => c.studentId === studentId);
    },
    [contributions]
  );

  // Get student IDs who have paid
  const getPaidStudentIds = useCallback((): string[] => {
    return contributions.map(c => c.studentId);
  }, [contributions]);

  return {
    contributions,
    loading,
    error,
    defaultNominal,
    loadingRef,
    loadContributions,
    addContribution,
    updateContribution,
    removeContribution,
    toggleStudent,
    hasStudentPaid,
    getPaidStudentIds,
  };
}
