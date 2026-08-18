import { ChevronUp, ChevronDown } from 'lucide-react';

type NominalStepperProps = {
  value: string;
  onChange: (value: string) => void;
  step?: number;
  min?: number;
  inputClassName?: string;
};

export function NominalStepper({
  value,
  onChange,
  step = 1000,
  min = 0,
  inputClassName = '',
}: NominalStepperProps) {
  const current = parseInt(value, 10) || 0;

  const increase = () => {
    onChange(String(current + step));
  };

  const decrease = () => {
    onChange(String(Math.max(current - step, min)));
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        placeholder="0"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border border-slate-200 px-3 py-2 text-right text-sm font-medium text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${inputClassName || 'w-24'}`}
      />
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={increase}
          aria-label={`Tambah ${step.toLocaleString('id-ID')}`}
          className="flex h-6 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-brand-100 hover:text-brand-700"
        >
          <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={decrease}
          disabled={current <= min}
          aria-label={`Kurangi ${step.toLocaleString('id-ID')}`}
          className="flex h-6 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}