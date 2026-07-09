import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/BottomNavigation';
import { SyncAgent } from '../components/SyncAgent';
import { SyncBadge } from '../components/SyncBadge';
import { useAppSettings } from '../hooks/useAppSettings';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { requestSync } from '../lib/sync';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppSettings();
  const syncState = useSyncStatus();

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-slate-50 shadow-soft">
        <SyncAgent />
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-600">
                Bantu Guru Yuk
              </p>
              <h1 className="mt-1 text-base font-semibold text-slate-900 truncate">
                {settings.className?.trim() || 'Kas Kelas'}
              </h1>
              <p className="truncate text-xs text-slate-500">
                {settings.schoolYear?.trim() || 'Siap sinkron ke Spreadsheet'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SyncBadge syncState={syncState} onClick={requestSync} />
              <button
                type="button"
                aria-label="Buka pengaturan"
                onClick={() => navigate('/settings')}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  location.pathname === '/settings'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span className="text-lg">⚙️</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          <Outlet />
        </main>

        <BottomNavigation />
      </div>
    </div>
  );
}
