import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { BottomNavigation } from '../components/BottomNavigation';
import { InstallBanner } from '../components/InstallBanner';
import { ReloadPrompt } from '../components/ReloadPrompt';
import { useAppSettings } from '../hooks/useAppSettings';

declare const __BUILD_ID__: string;

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppSettings();

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-slate-50 shadow-soft">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/guru-cibisd2.png"
                  alt="Logo Kas Kelas"
                  className="h-10 w-10 shrink-0 rounded-2xl shadow-soft"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-600">
                    Bantu Guru Yuk
                  </p>
                  <h1 className="mt-1 truncate text-base font-semibold text-slate-900">
                    {settings.className?.trim()
                      ? `Kas Kelas ${settings.className.trim()}`
                      : 'Kas Kelas'}
                  </h1>
                  <p className="truncate text-xs text-slate-500">
                    {settings.schoolYear?.trim()
                      ? `T.P. ${settings.schoolYear.trim()}`
                      : 'Data tersimpan online'}
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      {__BUILD_ID__}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                  <SettingsIcon className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
          </div>
        </header>

        <ReloadPrompt />
        <InstallBanner />

        <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          <Outlet />
        </main>

        <BottomNavigation />
      </div>
    </div>
  );
}
