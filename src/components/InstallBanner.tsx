import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

const DISMISS_KEY = 'bgy-install-banner-dismissed';

export function InstallBanner() {
  const { canInstall, install } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const autoPromptedRef = useRef(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!canInstall || dismissed || autoPromptedRef.current) {
      return;
    }

    autoPromptedRef.current = true;
    const timer = window.setTimeout(() => {
      void install().then((accepted) => {
        if (accepted) {
          setDismissed(true);
          localStorage.setItem(DISMISS_KEY, '1');
        }
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [canInstall, dismissed, install]);

  if (!canInstall || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) {
      setDismissed(true);
      localStorage.setItem(DISMISS_KEY, '1');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <div className="sticky top-[68px] z-10 flex items-center gap-3 bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-3 text-white shadow-soft">
      <Download className="h-5 w-5 shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Pasang Kas Kelas</p>
        <p className="text-xs text-white/85">Buka lebih cepat dari layar utama, bisa dipakai offline.</p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700"
      >
        Install
      </button>
      <button
        type="button"
        aria-label="Tutup"
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-2 text-white/80 transition hover:bg-white/10"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
