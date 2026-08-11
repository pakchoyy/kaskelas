import { useEffect, useState } from 'react';
import { defaultAppSettings, loadAppSettings, saveAppSettings, type AppSettings } from '../lib/appSettings';
import { settingsApi } from '../services/api';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  // Sync kas_kelas default nominal from backend settings (source of truth)
  useEffect(() => {
    let active = true;
    settingsApi
      .getAll()
      .then((rows) => {
        const kas = rows.find((s) => s.contributionType === 'kas_kelas');
        if (active && kas && kas.defaultNominal && kas.defaultNominal > 0) {
          setSettings((current) => ({ ...current, dailyCashNominal: kas.defaultNominal! }));
        }
      })
      .catch(() => {
        // Keep localStorage value if API unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const updateDailyCashNominal = async (nominal: number): Promise<boolean> => {
    if (!Number.isFinite(nominal) || nominal <= 0) {
      return false;
    }
    try {
      await settingsApi.update('kas_kelas', { defaultNominal: nominal });
      setSettings((current) => ({ ...current, dailyCashNominal: nominal }));
      return true;
    } catch (err) {
      console.error('Failed to update daily cash nominal:', err);
      return false;
    }
  };

  return {
    settings,
    setSettings,
    resetSettings: () => setSettings(defaultAppSettings),
    updateDailyCashNominal,
  };
}
