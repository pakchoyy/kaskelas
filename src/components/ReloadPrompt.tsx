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
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {},
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
