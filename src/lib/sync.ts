import { readStorage, writeStorage } from './storage';
import { dispatchAppEvent, SYNC_REQUEST_EVENT, SYNC_STATUS_UPDATED_EVENT } from './events';

export type SyncStatus = 'synced' | 'pending' | 'error';

export type SyncState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
};

export const SYNC_STATE_KEY = 'bgy-kas-kelas-sync-state';

export const defaultSyncState: SyncState = {
  status: 'pending',
  lastSyncedAt: null,
  lastAttemptAt: null,
  lastError: null,
};

export function loadSyncState(): SyncState {
  return readStorage(SYNC_STATE_KEY, defaultSyncState);
}

export function saveSyncState(state: SyncState): void {
  writeStorage(SYNC_STATE_KEY, state);
  dispatchAppEvent(SYNC_STATUS_UPDATED_EVENT);
}

export function setSyncPending(): void {
  const current = loadSyncState();
  saveSyncState({
    ...current,
    status: 'pending',
    lastAttemptAt: new Date().toISOString(),
    lastError: null,
  });
}

export function setSyncSynced(): void {
  const now = new Date().toISOString();
  saveSyncState({
    status: 'synced',
    lastSyncedAt: now,
    lastAttemptAt: now,
    lastError: null,
  });
}

export function setSyncError(message: string): void {
  const current = loadSyncState();
  saveSyncState({
    ...current,
    status: 'error',
    lastAttemptAt: new Date().toISOString(),
    lastError: message,
  });
}

export function requestSync(): void {
  dispatchAppEvent(SYNC_REQUEST_EVENT);
}
