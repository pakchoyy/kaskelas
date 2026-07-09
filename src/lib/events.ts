export const SETTINGS_UPDATED_EVENT = 'bgy:settings-updated';
export const APP_DATA_UPDATED_EVENT = 'bgy:app-data-updated';
export const SYNC_REQUEST_EVENT = 'bgy:sync-request';
export const SYNC_STATUS_UPDATED_EVENT = 'bgy:sync-status-updated';

export function dispatchAppEvent(eventName: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}
