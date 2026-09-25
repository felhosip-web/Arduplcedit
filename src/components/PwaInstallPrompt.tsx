import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Cpu } from 'lucide-react';

const STORAGE_KEY = 'arduplc_pwa_dismissed_until';
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 napig ne mutassa újra ha elutasítják

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    // 1. Ellenőrzés: ha már standalone (telepített PWA) nézetben fut az app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Ellenőrzés: elutasította-e a felhasználó az elmúlt 14 napban
    try {
      const dismissedUntil = localStorage.getItem(STORAGE_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
      }
    } catch (e) {
      console.error('LocalStorage error:', e);
    }

    // 3. Eseményfigyelő a böngésző install promptjához
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsVisible(false);
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    try {
      const until = Date.now() + DISMISS_DURATION_MS;
      localStorage.setItem(STORAGE_KEY, until.toString());
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
    setIsVisible(false);
  }, []);

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-slate-100 font-sans animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        {/* Logo Badge */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 p-0.5 shadow-md shadow-sky-500/20 shrink-0">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Cpu className="w-5 h-5 text-sky-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 tracking-wide">
              Telepítés alkalmazásként
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Telepítsd az <strong className="text-slate-100">Arduino PLC Ladder Studio</strong>-t asztali alkalmazásként a gyorsabb elérésért és az önálló ablakos nézetért.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Telepítés</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Később
            </button>
          </div>
        </div>

        {/* Close X */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
          title="Bezárás"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
