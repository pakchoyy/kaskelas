import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { ContributionPage } from './pages/ContributionPage';
import { FinancePage } from './pages/FinancePage';
import { RecapPage } from './pages/RecapPage';
import { SettingsPage } from './pages/SettingsPage';
import { TabunganPage } from './pages/TabunganPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'siswa', element: <StudentsPage /> },
      { path: 'iuran', element: <ContributionPage /> },
      { path: 'tabungan', element: <TabunganPage /> },
      { path: 'keuangan', element: <FinancePage /> },
      { path: 'rekap', element: <RecapPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
