export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw1g3U9hqZHIDHfGscXV9rMznBAXNg-FPAts1NkT-Q8pTx7KVwr6H09_7o7yBCS_53l/exec';

export function getEffectiveWebAppUrl(): string {
  if (typeof window === 'undefined') {
    return WEB_APP_URL;
  }

  try {
    const raw = window.localStorage.getItem('bgy-kas-kelas-settings');
    if (raw) {
      const parsed = JSON.parse(raw) as { webAppUrl?: string };
      if (parsed.webAppUrl && parsed.webAppUrl.trim()) {
        return parsed.webAppUrl.trim();
      }
    }
  } catch {
    // fallback to hardcoded
  }

  return WEB_APP_URL;
}
