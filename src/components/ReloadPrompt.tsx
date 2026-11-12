import { useEffect, useState } from 'react';

export function ReloadPrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    // @ts-ignore - virtual module dari vite-plugin-pwa
    import('virtual:pwa-register').then(({ registerSW }) => {
      if (!mounted) return;
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          // Pasang versi baru langsung, supaya aplikasi di HP tidak tertahan di versi lama
          setNeedRefresh(true);
          (update as any)?.(true);
        },
        onOfflineReady() {},
        onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
          if (!registration) return;
          // Cek versi baru tiap 30 menit dan setiap kali aplikasi dibuka lagi
          const check = () => registration.update().catch(() => {});
          window.setInterval(check, 30 * 60 * 1000);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') check();
          });
        },
      } as any);
      setUpdateSW(() => update as any);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!needRefresh || !updateSW) return null;

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
      <span>Versi baru tersedia</span>
      <button
        type="button"
        onClick={() => (updateSW as any)?.(true)}
        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-700"
      >
        Muat Ulang
      </button>
    </div>
  );
}
