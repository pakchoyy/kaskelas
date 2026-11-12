import type { ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { NominalStepper } from './NominalStepper';
import { formatCurrency } from '../lib/format';

type PeriodPaymentSectionProps = {
  title: string;
  periodLabel: string;
  periodHint?: string;
  nominalLabel: string;
  nominal: number;
  unit: string;
  emptyText: string;
  loading?: boolean;
  people: Array<{ id: string; name: string }>;
  isPaid: (id: string) => boolean;
  onToggle: (id: string) => void;
  /** Kalau ada, tiap baris punya isian nominal (tabungan guru); kalau tidak, baris = tombol centang. */
  stepper?: { value: (id: string) => string; onChange: (id: string, value: string) => void };
  stats: { paidCount: number; total: number };
  onPrev: () => void;
  onNext: () => void;
  onSave?: () => void;
  /** Konten tambahan di atas tombol Simpan, misalnya kartu penarikan. */
  children?: ReactNode;
};

const circle = (paid: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded-full ${paid ? 'bg-brand-600 text-white' : 'border-2 border-slate-300 text-slate-300'}`;

/** Satu layar iuran per periode (bulan/triwulan) yang dipakai Tabungan Guru dan iuran Ibu-ibu. */
export function PeriodPaymentSection({
  title, periodLabel, periodHint, nominalLabel, nominal, unit, emptyText, loading = false,
  people, isPaid, onToggle, stepper, stats, onPrev, onNext, onSave, children,
}: PeriodPaymentSectionProps) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><ChevronLeft className="h-5 w-5" strokeWidth={2} /></button>
          <p className="text-sm font-medium text-slate-700">{periodLabel}</p>
          <button type="button" onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><ChevronRight className="h-5 w-5" strokeWidth={2} /></button>
        </div>
        {periodHint && <p className="mt-1 text-center text-xs text-slate-400">{periodHint}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">{nominalLabel}</p>
          <p className="text-base font-semibold text-slate-900">{formatCurrency(nominal)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Memuat...</p>
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {people.map((person, index) => {
              const paid = isPaid(person.id);
              const rowClass = `rounded-lg border border-slate-100 p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-emerald-50'}`;
              if (stepper) {
                return (
                  <div key={person.id} className={`flex items-center justify-between gap-3 ${rowClass}`}>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => onToggle(person.id)} className={circle(paid)}>{paid && <Check className="h-4 w-4" strokeWidth={3} />}</button>
                      <p className="text-sm font-medium text-slate-900">{person.name}</p>
                    </div>
                    <NominalStepper value={stepper.value(person.id)} onChange={(v) => stepper.onChange(person.id, v)} />
                  </div>
                );
              }
              return (
                <button key={person.id} type="button" onClick={() => onToggle(person.id)} className={`flex w-full items-center justify-between gap-3 text-left ${rowClass}`}>
                  <p className="text-sm font-medium text-slate-900">{person.name}</p>
                  <div className={circle(paid)}>{paid && <Check className="h-4 w-4" strokeWidth={3} />}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-medium text-slate-500">Sudah bayar</p><p className="mt-1 text-base font-semibold text-slate-900">{stats.paidCount} {unit}</p></div>
          <div className="text-right"><p className="text-xs font-medium text-slate-500">Total</p><p className="mt-1 text-lg font-semibold text-brand-700">{formatCurrency(stats.total)}</p></div>
        </div>
      </div>

      {children}

      {onSave && (
        <button type="button" onClick={onSave} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white"><Save className="h-5 w-5" strokeWidth={2} />Simpan</button>
      )}
      <div className="flex items-center justify-center gap-6 py-1">
        <button type="button" onClick={onPrev} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={onNext} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </>
  );
}
