import { useEffect, useState } from 'react';
import { loadSyncState, type SyncState } from '../lib/sync';
import { SYNC_STATUS_UPDATED_EVENT } from '../lib/events';

export function useSyncStatus() {
  const [syncState, setSyncState] = useState<SyncState>(() => loadSyncState());

  useEffect(() => {
    const refresh = () => setSyncState(loadSyncState());

    window.addEventListener(SYNC_STATUS_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener(SYNC_STATUS_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return syncState;
}
