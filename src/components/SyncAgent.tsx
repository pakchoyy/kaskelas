import { useEffect, useRef } from 'react';
import { loadAppSettings } from '../lib/appSettings';
import { loadCashRecords, loadFinanceRecords, loadStudents } from '../lib/appData';
import { APP_DATA_UPDATED_EVENT, SYNC_REQUEST_EVENT } from '../lib/events';
import { requestSync, setSyncError, setSyncPending, setSyncSynced } from '../lib/sync';
import {
  pingAppsScript,
  syncCashToAppsScript,
  syncFinanceToAppsScript,
  syncStudentsToAppsScript,
} from '../services/appsScript';

export function SyncAgent() {
  const isSyncingRef = useRef(false);
  const didInitialSyncRef = useRef(false);

  useEffect(() => {
    const performSync = async () => {
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setSyncPending();

      try {
        const settings = loadAppSettings();
        const webAppUrl = settings.webAppUrl.trim();

        if (!webAppUrl) {
          setSyncError('Isi Web App URL di Pengaturan terlebih dahulu.');
          return;
        }

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          setSyncPending();
          return;
        }

        const students = loadStudents();
        const cashRecords = loadCashRecords();
        const financeRecords = loadFinanceRecords();

        await pingAppsScript(webAppUrl);
        await syncStudentsToAppsScript(webAppUrl, students);
        await syncCashToAppsScript(webAppUrl, cashRecords, students);
        await syncFinanceToAppsScript(webAppUrl, financeRecords);

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

    const handleRequest = () => {
      void performSync();
    };

    const handleOnline = () => {
      void performSync();
    };

    const handleAppDataUpdated = () => {
      requestSync();
    };

    window.addEventListener(SYNC_REQUEST_EVENT, handleRequest);
    window.addEventListener('online', handleOnline);
    window.addEventListener(APP_DATA_UPDATED_EVENT, handleAppDataUpdated);

    const initialSettings = loadAppSettings();
    if (initialSettings.webAppUrl.trim()) {
      didInitialSyncRef.current = true;
      void performSync();
    }

    return () => {
      window.removeEventListener(SYNC_REQUEST_EVENT, handleRequest);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(APP_DATA_UPDATED_EVENT, handleAppDataUpdated);
    };
  }, []);

  return null;
}
