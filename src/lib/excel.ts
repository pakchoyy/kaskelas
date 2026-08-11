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
  const entries = Object.entries(row);

  for (const key of keys) {
    const value = row[key.toLowerCase()];
    if (value) {
      return value;
    }
  }

  for (const key of keys) {
    const found = entries.find(([k]) => k.includes(key));
    if (found && found[1]) {
      return found[1];
    }
  }

  const firstCell = entries[0]?.[1] ?? '';
  return firstCell;
}

export function extractStudentNames(rows: ExcelRow[]): string[] {
  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }

  const keys = Object.keys(firstRow);
  const nameColumn =
    ['nama', 'name', 'siswa', 'murid', 'panggilan']
      .map((keyword) => keys.find((k) => k.includes(keyword)))
      .find(Boolean) || null;

  return rows
    .map((row) => {
      let raw = nameColumn ? row[nameColumn] : '';

      if (!raw) {
        for (const value of Object.values(row)) {
          if (typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) {
            raw = value;
            break;
          }
        }
      }

      const name = raw.trim();
      if (!name || /^\d+$/.test(name)) {
        return null;
      }
      return name;
    })
    .filter((name): name is string => name !== null);
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
