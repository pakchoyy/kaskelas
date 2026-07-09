import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { SyncState } from '../lib/sync';

type SyncBadgeProps = {
  syncState: SyncState;
  onClick?: () => void;
};

export function SyncBadge({ syncState, onClick }: SyncBadgeProps) {
  const label =
    syncState.status === 'synced'
      ? 'Synced'
      : syncState.status === 'pending'
        ? 'Pending'
        : 'Error';

  const toneClass =
    syncState.status === 'synced'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : syncState.status === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  const Icon =
    syncState.status === 'synced' ? CheckCircle2 : syncState.status === 'pending' ? Clock : XCircle;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${toneClass}`}
      title={syncState.lastError || 'Tap untuk sinkronisasi manual'}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
