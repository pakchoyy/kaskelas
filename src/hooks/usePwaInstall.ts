import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let sharedPromptEvent: BeforeInstallPromptEvent | null = null;

const listeners = new Set<(event: BeforeInstallPromptEvent | null) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(sharedPromptEvent);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    sharedPromptEvent = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    sharedPromptEvent = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(sharedPromptEvent);

  useEffect(() => {
    const handler = (event: BeforeInstallPromptEvent | null) => setPromptEvent(event);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const install = useCallback(async () => {
    const event = sharedPromptEvent;
    if (!event) return false;

    await event.prompt();
    const choice = await event.userChoice;
    sharedPromptEvent = null;
    notifyListeners();

    return choice.outcome === 'accepted';
  }, []);

  return {
    canInstall: promptEvent !== null,
    install,
  };
}
