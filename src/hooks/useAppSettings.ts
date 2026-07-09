import { useEffect, useState } from 'react';
import { defaultAppSettings, loadAppSettings, saveAppSettings, type AppSettings } from '../lib/appSettings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  return {
    settings,
    setSettings,
    resetSettings: () => setSettings(defaultAppSettings),
  };
}
