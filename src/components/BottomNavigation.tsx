import { NavLink } from 'react-router-dom';

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/siswa', label: 'Siswa', icon: '👥' },
  { to: '/kas', label: 'Kas', icon: '✅' },
  { to: '/keuangan', label: 'Keuangan', icon: '💰' },
  { to: '/rekap', label: 'Rekap', icon: '📋' },
];

export function BottomNavigation() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/98 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => (
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
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-1 truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
