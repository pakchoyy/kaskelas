import { readStorage, writeStorage } from './storage';

export type AppSettings = {
  webAppUrl: string;
  dailyCashNominal: number;
  className: string;
  schoolYear: string;
};

export const APP_SETTINGS_KEY = 'bgy-kas-kelas-settings';

export const defaultAppSettings: AppSettings = {
  webAppUrl: '',
  dailyCashNominal: 1000,
  className: '',
  schoolYear: '',
};

export function loadAppSettings(): AppSettings {
  return readStorage(APP_SETTINGS_KEY, defaultAppSettings);
}

export function saveAppSettings(settings: AppSettings): void {
  writeStorage(APP_SETTINGS_KEY, settings);
}
