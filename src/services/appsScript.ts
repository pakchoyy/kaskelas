import type { CashDateRecord, FinanceTransaction, Student } from '../lib/appData';

async function parseResponse(response: Response): Promise<void> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!text.trim()) {
    return;
  }

  let parsed: { success?: boolean; message?: string };
  try {
    parsed = JSON.parse(text) as { success?: boolean; message?: string };
  } catch {
    throw new Error('Respon dari Apps Script bukan JSON yang valid.');
  }

  if (parsed.success === false) {
    throw new Error(parsed.message || 'Apps Script menolak request.');
  }
}

async function postAction(url: string, action: string, payload: Record<string, unknown>): Promise<void> {
  const body = new URLSearchParams();
  body.set('action', action);
  body.set('payload', JSON.stringify(payload));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  });

  await parseResponse(response);
}

export async function pingAppsScript(url: string): Promise<void> {
  const target = new URL(url);
  target.searchParams.set('action', 'ping');

  const response = await fetch(target.toString(), { method: 'GET' });
  await parseResponse(response);
}

export async function fetchAppsScriptData(url: string): Promise<{
  students: Student[];
  cashRecords: CashDateRecord[];
  financeRecords: FinanceTransaction[];
}> {
  const target = new URL(url);
  target.searchParams.set('action', 'getData');

  const response = await fetch(target.toString(), { method: 'GET' });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `HTTP ${response.status}`);
  }

  let parsed: { success?: boolean; data?: { students?: Student[]; cashRecords?: CashDateRecord[]; financeRecords?: FinanceTransaction[] }; message?: string };
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Respon dari Apps Script bukan JSON. Periksa URL Web App.');
  }

  if (parsed.success === false) {
    throw new Error(parsed.message || 'Gagal mengambil data dari Apps Script.');
  }

  return {
    students: parsed.data?.students ?? [],
    cashRecords: parsed.data?.cashRecords ?? [],
    financeRecords: parsed.data?.financeRecords ?? [],
  };
}

export async function syncStudentsToAppsScript(url: string, students: Student[]): Promise<void> {
  await postAction(url, 'saveSiswa', { students });
}

export async function syncCashToAppsScript(
  url: string,
  cashRecords: Record<string, CashDateRecord>,
  students: Student[],
): Promise<void> {
  const studentNameById = new Map(students.map((student) => [student.id, student.name]));
  const cashRows = Object.values(cashRecords).flatMap((record) =>
    record.checkedStudentIds.map((studentId) => ({
      date: record.date,
      studentId,
      studentName: studentNameById.get(studentId) || studentId,
      status: 1,
      updatedAt: record.updatedAt,
    })),
  );

  await postAction(url, 'saveKas', { cashRecords: cashRows });
}

export async function syncFinanceToAppsScript(url: string, financeRecords: FinanceTransaction[]): Promise<void> {
  await postAction(url, 'saveKeuangan', { financeRecords });
}
