import { useEffect, useRef } from 'react';
import { getEffectiveWebAppUrl } from '../lib/config';
import { loadCashRecords, loadFinanceRecords, loadStudents } from '../lib/appData';
import { APP_DATA_UPDATED_EVENT, REFRESH_SPREADSHEET_EVENT, SYNC_REQUEST_EVENT } from '../lib/events';
import { loadSyncState, requestSync, setSyncError, setSyncPending, setSyncSynced } from '../lib/sync';
import {
  pingAppsScript,
  syncCashToAppsScript,
  syncFinanceToAppsScript,
  syncStudentsToAppsScript,
} from '../services/appsScript';

export function SyncAgent() {
  const isSyncingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const performSync = async () => {
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setSyncPending();

      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setSyncPending();
          return;
        }

        const students = loadStudents();
        const cashRecords = loadCashRecords();
        const financeRecords = loadFinanceRecords();

        const url = getEffectiveWebAppUrl();
        await pingAppsScript(url);
        await syncStudentsToAppsScript(url, students);
        await syncCashToAppsScript(url, cashRecords, students);
        await syncFinanceToAppsScript(url, financeRecords);

        setSyncSynced();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sinkronisasi gagal.';
        if (message.toLowerCase().includes('offline')) {
          setSyncPending();
        } else {
          setSyncError(message);
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    const performRefresh = async () => {
      if (isRefreshingRef.current) {
        return;
      }

      const syncState = loadSyncState();
      if (syncState.status === 'pending' || isSyncingRef.current) {
        return;
      }

      isRefreshingRef.current = true;
      window.dispatchEvent(new Event(REFRESH_SPREADSHEET_EVENT));
      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 8000);
    };

    const handleRequest = () => {
      void performSync();
    };

    const handleOnline = () => {
      void performSync();
    };

    const handleAppDataUpdated = () => {
      requestSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void performRefresh();
      }
    };

    const handleFocus = () => {
      void performRefresh();
    };

    window.addEventListener(SYNC_REQUEST_EVENT, handleRequest);
    window.addEventListener('online', handleOnline);
    window.addEventListener(APP_DATA_UPDATED_EVENT, handleAppDataUpdated);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = setInterval(() => {
      void performRefresh();
    }, 60000);

    return () => {
      window.removeEventListener(SYNC_REQUEST_EVENT, handleRequest);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(APP_DATA_UPDATED_EVENT, handleAppDataUpdated);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  return null;
}
