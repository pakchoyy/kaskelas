import { createId } from './ids';
import { readStorage, writeStorage } from './storage';

export type Student = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type CashDateRecord = {
  date: string;
  checkedStudentIds: string[];
  updatedAt: string;
};

export type AppData = {
  students: Student[];
  cashRecords: Record<string, CashDateRecord>;
};

export type FinanceTransactionType = 'Pengeluaran' | 'Pemasukan';

export type FinanceTransaction = {
  id: string;
  type: FinanceTransactionType;
  date: string;
  nominal: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type FinanceRecords = FinanceTransaction[];

export const STUDENTS_STORAGE_KEY = 'bgy-kas-kelas-students';
export const CASH_STORAGE_KEY = 'bgy-kas-kelas-cash-records';
export const FINANCE_STORAGE_KEY = 'bgy-kas-kelas-finance-records';

const emptyData: AppData = {
  students: [],
  cashRecords: {},
};

export function loadStudents(): Student[] {
  return readStorage(STUDENTS_STORAGE_KEY, emptyData.students);
}

export function saveStudents(students: Student[]): void {
  writeStorage(STUDENTS_STORAGE_KEY, students);
}

export function loadCashRecords(): Record<string, CashDateRecord> {
  return readStorage(CASH_STORAGE_KEY, emptyData.cashRecords);
}

export function saveCashRecords(records: Record<string, CashDateRecord>): void {
  writeStorage(CASH_STORAGE_KEY, records);
}

export function loadFinanceRecords(): FinanceTransaction[] {
  return readStorage(FINANCE_STORAGE_KEY, [] as FinanceTransaction[]);
}

export function saveFinanceRecords(records: FinanceTransaction[]): void {
  writeStorage(FINANCE_STORAGE_KEY, records);
}

export function createStudent(name: string): Student {
  const now = new Date().toISOString();

  return {
    id: createId('student'),
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export function createCashRecord(date: string, checkedStudentIds: string[]): CashDateRecord {
  return {
    date,
    checkedStudentIds,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeCheckedIds(checkedStudentIds: string[]): string[] {
  return Array.from(new Set(checkedStudentIds));
}

export function createFinanceTransaction(
  type: FinanceTransactionType,
  date: string,
  nominal: number,
  note: string,
): FinanceTransaction {
  const now = new Date().toISOString();

  return {
    id: createId('finance'),
    type,
    date,
    nominal,
    note,
    createdAt: now,
    updatedAt: now,
  };
}
