import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createCashRecord,
  createFinanceTransaction,
  createStudent,
  loadFinanceRecords,
  loadCashRecords,
  loadStudents,
  normalizeCheckedIds,
  saveFinanceRecords,
  saveCashRecords,
  saveStudents,
  type FinanceTransaction,
  type CashDateRecord,
  type Student,
} from '../lib/appData';
import { dispatchAppEvent, APP_DATA_UPDATED_EVENT, REFRESH_SPREADSHEET_EVENT } from '../lib/events';
import { loadSyncState, setSyncError, setSyncPending, setSyncSynced } from '../lib/sync';
import { fetchAppsScriptData } from '../services/appsScript';
import { getEffectiveWebAppUrl } from '../lib/config';

export function useAppData() {
  const [students, setStudents] = useState<Student[]>(() => loadStudents());
  const [cashRecords, setCashRecords] = useState<Record<string, CashDateRecord>>(() => loadCashRecords());
  const [financeRecords, setFinanceRecords] = useState<FinanceTransaction[]>(() => loadFinanceRecords());
  const isHydratedRef = useRef(false);
  const isRefreshingRef = useRef(false);

  const refreshFromStorage = () => {
    setStudents(loadStudents());
    setCashRecords(loadCashRecords());
    setFinanceRecords(loadFinanceRecords());
  };

  const refreshFromSpreadsheet = async () => {
    if (isRefreshingRef.current) {
      return false;
    }

    const syncState = loadSyncState();
    if (syncState.status === 'pending') {
      return false;
    }

    isRefreshingRef.current = true;

    try {
      const data = await fetchAppsScriptData(getEffectiveWebAppUrl());

      setStudents(data.students);
      setCashRecords(
        data.cashRecords.reduce<Record<string, CashDateRecord>>((accumulator, record) => {
          accumulator[record.date] = record;
          return accumulator;
        }, {}),
      );
      setFinanceRecords(data.financeRecords);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memuat data dari Spreadsheet.';
      setSyncError(message);
      return false;
    } finally {
      queueMicrotask(() => {
        isRefreshingRef.current = false;
      });
    }
  };

  useEffect(() => {
    saveStudents(students);
    if (isHydratedRef.current && !isRefreshingRef.current) {
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    }
  }, [students]);

  useEffect(() => {
    saveCashRecords(cashRecords);
    if (isHydratedRef.current && !isRefreshingRef.current) {
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    }
  }, [cashRecords]);

  useEffect(() => {
    saveFinanceRecords(financeRecords);
    if (isHydratedRef.current && !isRefreshingRef.current) {
      dispatchAppEvent(APP_DATA_UPDATED_EVENT);
    }
  }, [financeRecords]);

  useEffect(() => {
    isHydratedRef.current = true;
  }, []);

  useEffect(() => {
    const handler = () => { void refreshFromSpreadsheet(); };
    window.addEventListener(REFRESH_SPREADSHEET_EVENT, handler);

    void refreshFromSpreadsheet();

    return () => window.removeEventListener(REFRESH_SPREADSHEET_EVENT, handler);
  }, []);

  const actions = useMemo(() => {
    return {
      addStudent(name: string) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return false;
        }

        setStudents((current) => [...current, createStudent(trimmedName)]);
        return true;
      },
      updateStudent(studentId: string, name: string) {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return false;
        }

        setStudents((current) =>
          current.map((student) =>
            student.id === studentId
              ? { ...student, name: trimmedName, updatedAt: new Date().toISOString() }
              : student,
          ),
        );
        return true;
      },
      deleteStudent(studentId: string) {
        setStudents((current) => current.filter((student) => student.id !== studentId));
        setCashRecords((current) => {
          const nextRecords: Record<string, CashDateRecord> = {};

          for (const [date, record] of Object.entries(current)) {
            nextRecords[date] = {
              ...record,
              checkedStudentIds: record.checkedStudentIds.filter((id) => id !== studentId),
              updatedAt: new Date().toISOString(),
            };
          }

          return nextRecords;
        });
      },
      setCheckedStudents(date: string, checkedStudentIds: string[]) {
        setCashRecords((current) => ({
          ...current,
          [date]: createCashRecord(date, normalizeCheckedIds(checkedStudentIds)),
        }));
      },
      toggleStudentOnDate(date: string, studentId: string) {
        setCashRecords((current) => {
          const existing = current[date] ?? createCashRecord(date, []);
          const checkedStudentIds = existing.checkedStudentIds.includes(studentId)
            ? existing.checkedStudentIds.filter((id) => id !== studentId)
            : [...existing.checkedStudentIds, studentId];

          return {
            ...current,
            [date]: {
              ...existing,
              checkedStudentIds: normalizeCheckedIds(checkedStudentIds),
              updatedAt: new Date().toISOString(),
            },
          };
        });
      },
      saveCurrentState() {
        saveStudents(students);
        saveCashRecords(cashRecords);
        saveFinanceRecords(financeRecords);
      },
      addFinanceTransaction(type: FinanceTransaction['type'], date: string, nominal: number, note: string) {
        const trimmedNote = note.trim();
        if (!trimmedNote || nominal <= 0) {
          return false;
        }

        setFinanceRecords((current) => [...current, createFinanceTransaction(type, date, nominal, trimmedNote)]);
        return true;
      },
      updateFinanceTransaction(
        transactionId: string,
        type: FinanceTransaction['type'],
        date: string,
        nominal: number,
        note: string,
      ) {
        const trimmedNote = note.trim();
        if (!trimmedNote || nominal <= 0) {
          return false;
        }

        setFinanceRecords((current) =>
          current.map((transaction) =>
            transaction.id === transactionId
              ? { ...transaction, type, date, nominal, note: trimmedNote, updatedAt: new Date().toISOString() }
              : transaction,
          ),
        );
        return true;
      },
      deleteFinanceTransaction(transactionId: string) {
        setFinanceRecords((current) => current.filter((transaction) => transaction.id !== transactionId));
      },
    };
  }, [cashRecords, financeRecords, students]);

  return {
    students,
    cashRecords,
    financeRecords,
    refreshFromStorage,
    refreshFromSpreadsheet,
    ...actions,
  };
}
