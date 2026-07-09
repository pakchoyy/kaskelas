import { NavLink } from 'react-router-dom';
import { Home, Users, CheckCircle2, Wallet, ClipboardList } from 'lucide-react';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/siswa', label: 'Siswa', icon: Users },
  { to: '/kas', label: 'Kas', icon: CheckCircle2 },
  { to: '/keuangan', label: 'Keuangan', icon: Wallet },
  { to: '/rekap', label: 'Rekap', icon: ClipboardList },
];

export function BottomNavigation() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="mt-1 truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
