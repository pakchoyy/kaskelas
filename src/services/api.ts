// API Client for Kas Kelas Backend
// Base URL configured for development/production

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  const result: ApiResponse<T> = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'API request failed');
  }
  
  return result.data as T;
}

// Student types
export type Student = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// Contribution types
export type ContributionType = 'kas_kelas' | 'amal_jumat' | 'paguyuban_ngaji' | 'tabungan';

export type Contribution = {
  id: string;
  studentId: string;
  contributionType: ContributionType;
  date: string;
  nominal: number;
  periodMonth: number | null;
  periodYear: number | null;
  createdAt: string;
  updatedAt: string;
};

// Finance types
export type TransactionType = 'pemasukan' | 'pengeluaran';

export type FinanceTransaction = {
  id: string;
  type: TransactionType;
  date: string;
  nominal: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

// Dashboard types
export type DashboardMetrics = {
  totalStudents: number;
  totalKasMasuk: number;
  totalTabungan: number;
  totalPemasukanLain: number;
  totalPengeluaran: number;
  saldo: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    type: string;
    note?: string;
    count?: number;
    amount: number;
  }>;
};

// Recap types
export type RecapData = {
  perStudent: Array<{
    id: string;
    number: number;
    name: string;
    paidDays: number;
    total: number;
  }>;
  totalKasMasuk: number;
  totalPemasukanLain: number;
  totalPengeluaran: number;
  saldoKelas: number;
  latestCashDate: string | null;
};

export type ContributionSetting = {
  id: string;
  contributionType: ContributionType;
  defaultNominal: number | null;
  isFixed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  scope: string;
  periodKey: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type AmalJumatMarker = {
  id: string;
  fridayDate: string;
  handedOver: boolean;
  createdAt: string;
  updatedAt: string;
};

// Students API
export const studentsApi = {
  async getAll(includeInactive = false): Promise<Student[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return fetchApi<Student[]>(`/students${query}`);
  },
  
  async create(name: string): Promise<Student> {
    return fetchApi<Student>('/students', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },
  
  async update(id: string, name: string): Promise<Student> {
    return fetchApi<Student>(`/students?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },
  
  async delete(id: string): Promise<Student> {
    return fetchApi<Student>(`/students?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Contributions API
export const contributionsApi = {
  async getAll(filters?: {
    contributionType?: ContributionType;
    studentId?: string;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    periodMonth?: number;
    periodYear?: number;
  }): Promise<Contribution[]> {
    const params = new URLSearchParams();
    
    if (filters?.contributionType) params.set('contribution_type', filters.contributionType);
    if (filters?.studentId) params.set('student_id', filters.studentId);
    if (filters?.date) params.set('date', filters.date);
    if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
    if (filters?.dateTo) params.set('date_to', filters.dateTo);
    if (filters?.periodMonth) params.set('period_month', filters.periodMonth.toString());
    if (filters?.periodYear) params.set('period_year', filters.periodYear.toString());
    
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<Contribution[]>(`/contributions${query}`);
  },
  
  async create(data: {
    studentId: string;
    contributionType: ContributionType;
    date: string;
    nominal: number;
    periodMonth?: number;
    periodYear?: number;
  }): Promise<Contribution> {
    return fetchApi<Contribution>('/contributions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id: string, data: { nominal?: number; date?: string }): Promise<Contribution> {
    return fetchApi<Contribution>(`/contributions?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: string): Promise<Contribution> {
    return fetchApi<Contribution>(`/contributions?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Finance API
export const financeApi = {
  async getAll(filters?: {
    type?: TransactionType;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<FinanceTransaction[]> {
    const params = new URLSearchParams();
    
    if (filters?.type) params.set('type', filters.type);
    if (filters?.dateFrom) params.set('date_from', filters.dateFrom);
    if (filters?.dateTo) params.set('date_to', filters.dateTo);
    
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<FinanceTransaction[]>(`/finance${query}`);
  },
  
  async create(data: {
    type: TransactionType;
    date: string;
    nominal: number;
    note: string;
  }): Promise<FinanceTransaction> {
    return fetchApi<FinanceTransaction>('/finance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id: string, data: {
    type?: TransactionType;
    date?: string;
    nominal?: number;
    note?: string;
  }): Promise<FinanceTransaction> {
    return fetchApi<FinanceTransaction>(`/finance?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: string): Promise<FinanceTransaction> {
    return fetchApi<FinanceTransaction>(`/finance?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsApi = {
  async getAll(): Promise<ContributionSetting[]> {
    return fetchApi<ContributionSetting[]>('/settings');
  },
  
  async update(
    contributionType: ContributionType,
    data: { defaultNominal?: number | null }
  ): Promise<ContributionSetting> {
    return fetchApi<ContributionSetting>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ contributionType, ...data }),
    });
  },
};

// Notes API
export const notesApi = {
  async getAll(filters?: {
    scope?: string;
    periodKey?: string;
  }): Promise<Note[]> {
    const params = new URLSearchParams();
    
    if (filters?.scope) params.set('scope', filters.scope);
    if (filters?.periodKey) params.set('period_key', filters.periodKey);
    
    const query = params.toString() ? `?${params}` : '';
    return fetchApi<Note[]>(`/notes${query}`);
  },
  
  async create(data: { scope: string; periodKey: string; text: string }): Promise<Note> {
    return fetchApi<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async update(id: string, data: { text: string }): Promise<Note> {
    return fetchApi<Note>(`/notes?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  async delete(id: string): Promise<Note> {
    return fetchApi<Note>(`/notes?id=${id}`, {
      method: 'DELETE',
    });
  },
};

// Amal Jumat Marker API
export const amalJumatApi = {
  async get(fridayDate: string): Promise<AmalJumatMarker | null> {
    return fetchApi<AmalJumatMarker | null>(`/markers?friday_date=${encodeURIComponent(fridayDate)}`);
  },
  
  async upsert(fridayDate: string, handedOver: boolean): Promise<AmalJumatMarker> {
    return fetchApi<AmalJumatMarker>('/markers', {
      method: 'PATCH',
      body: JSON.stringify({ fridayDate, handedOver }),
    });
  },
};

// Dashboard API
export const dashboardApi = {
  async getMetrics(): Promise<DashboardMetrics> {
    return fetchApi<DashboardMetrics>('/dashboard');
  },
};

// Recap API
export const recapApi = {
  async getData(contributionType: ContributionType = 'kas_kelas'): Promise<RecapData> {
    return fetchApi<RecapData>(`/recap?contribution_type=${contributionType}`);
  },
};
