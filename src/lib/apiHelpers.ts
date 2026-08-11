// Helper to map frontend contribution type format to API format
export function mapContributionTypeToApi(type: string): 'kas_kelas' | 'amal_jumat' | 'paguyuban_ngaji' {
  const mapping: Record<string, 'kas_kelas' | 'amal_jumat' | 'paguyuban_ngaji'> = {
    'kas-kelas': 'kas_kelas',
    'amal-jumat': 'amal_jumat',
    'paguyuban-ngaji': 'paguyuban_ngaji',
  };
  return mapping[type] || 'kas_kelas';
}

// Helper to map API contribution type format to frontend format
export function mapContributionTypeFromApi(type: string): 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji' {
  const mapping: Record<string, 'kas-kelas' | 'amal-jumat' | 'paguyuban-ngaji'> = {
    'kas_kelas': 'kas-kelas',
    'amal_jumat': 'amal-jumat',
    'paguyuban_ngaji': 'paguyuban-ngaji',
  };
  return mapping[type] || 'kas-kelas';
}

// Helper to map finance type
export function mapFinanceTypeToApi(type: string): 'pemasukan' | 'pengeluaran' {
  return type === 'Pemasukan' ? 'pemasukan' : 'pengeluaran';
}

export function mapFinanceTypeFromApi(type: string): 'Pemasukan' | 'Pengeluaran' {
  return type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
}
