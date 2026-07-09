export type ExcelRow = Record<string, string>;

export async function readExcelRows(file: File): Promise<ExcelRow[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '', raw: false });

  return rows.map((row) => {
    const normalized: ExcelRow = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).trim().toLowerCase()] = String(value ?? '').trim();
    }
    return normalized;
  });
}

function pickValue(row: ExcelRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key.toLowerCase()];
    if (value) {
      return value;
    }
  }

  const firstCell = Object.values(row)[0] ?? '';
  return firstCell;
}

export function extractStudentNames(rows: ExcelRow[]): string[] {
  return rows
    .map((row) => pickValue(row, ['nama', 'name', 'siswa']))
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export type ParsedFinanceRow = {
  date: string;
  type: 'Pengeluaran' | 'Pemasukan';
  nominal: number;
  note: string;
};

export function extractFinanceRows(rows: ExcelRow[]): ParsedFinanceRow[] {
  return rows
    .map((row) => {
      const rawType = pickValue(row, ['tipe', 'type', 'jenis']).toLowerCase();
      const type: 'Pengeluaran' | 'Pemasukan' = rawType.includes('pemasukan') || rawType.includes('masuk') ? 'Pemasukan' : 'Pengeluaran';
      const nominal = Number(String(pickValue(row, ['nominal', 'jumlah', 'amount'])).replace(/[^\d]/g, ''));
      const note = pickValue(row, ['keterangan', 'note', 'deskripsi']);
      const date = pickValue(row, ['tanggal', 'date', 'tgl']);

      if (!date || !nominal || !note) {
        return null;
      }

      return { date, type, nominal, note };
    })
    .filter((row): row is ParsedFinanceRow => row !== null);
}
