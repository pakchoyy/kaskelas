export type LetterFilter = 'semua' | 'a-f' | 'g-l' | 'm-r' | 's-z';

export const letterFilterOptions: Array<{ value: LetterFilter; label: string }> = [
  { value: 'semua', label: 'Semua' },
  { value: 'a-f', label: 'A-F' },
  { value: 'g-l', label: 'G-L' },
  { value: 'm-r', label: 'M-R' },
  { value: 's-z', label: 'S-Z' },
];

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { sensitivity: 'base' }));
}

export function matchesLetterFilter(name: string, filter: LetterFilter): boolean {
  if (filter === 'semua') {
    return true;
  }

  const first = name.trim().charAt(0).toUpperCase();
  if (filter === 'a-f') return first >= 'A' && first <= 'F';
  if (filter === 'g-l') return first >= 'G' && first <= 'L';
  if (filter === 'm-r') return first >= 'M' && first <= 'R';
  return first >= 'S' && first <= 'Z';
}
