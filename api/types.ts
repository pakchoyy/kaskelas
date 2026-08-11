// Database types
export type Student = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContributionType = 'kas_kelas' | 'amal_jumat' | 'paguyuban_ngaji';

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

export type ContributionSetting = {
  id: string;
  contributionType: ContributionType;
  defaultNominal: number | null;
  isFixed: boolean;
  createdAt: string;
  updatedAt: string;
};

// API Response types
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type DashboardMetrics = {
  totalStudents: number;
  totalKasMasuk: number;
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

// Frontend compatibility types (for localStorage format)
export type CashDateRecord = {
  date: string;
  checkedStudentIds: string[];
  updatedAt: string;
};
