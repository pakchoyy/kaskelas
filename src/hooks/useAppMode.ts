import { useEffect, useState } from 'react';

export type AppMode = 'siswa' | 'guru';

const STORAGE_KEY = 'app-mode';

export function useAppMode() {
  const [mode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as AppMode | null;
    return saved === 'guru' ? 'guru' : 'siswa';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('app-mode-changed', { detail: mode }));
  }, [mode]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as AppMode;
      if (detail === 'siswa' || detail === 'guru') setMode(detail);
    };
    window.addEventListener('app-mode-changed', handler as EventListener);
    return () => window.removeEventListener('app-mode-changed', handler as EventListener);
  }, []);

  return { mode, setMode, isGuru: mode === 'guru', isSiswa: mode === 'siswa' };
}
