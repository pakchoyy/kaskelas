import { readStorage, writeStorage } from './storage';
import { WEB_APP_URL } from './config';

export type AppSettings = {
  webAppUrl: string;
  dailyCashNominal: number;
  className: string;
  schoolYear: string;
};

export const APP_SETTINGS_KEY = 'bgy-kas-kelas-settings';

export const defaultAppSettings: AppSettings = {
  webAppUrl: WEB_APP_URL,
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
