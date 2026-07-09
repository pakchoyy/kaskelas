import type { ReactNode } from 'react';

type PageShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-4 text-white shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/80">Menu</p>
        <h2 className="mt-2 text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-white/90">{description}</p>
      </div>

      {children}
    </section>
  );
}
