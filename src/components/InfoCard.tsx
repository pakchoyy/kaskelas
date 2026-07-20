import type { ReactNode } from 'react';

type InfoCardProps = {
  title: string;
  value: string;
  tone?: 'brand' | 'muted';
  children?: ReactNode;
};

export function InfoCard({ title, value, tone = 'muted', children }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === 'brand' ? 'text-brand-700' : 'text-slate-900'}`}>
        {value}
      </p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
