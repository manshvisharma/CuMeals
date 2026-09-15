import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { CuMealsLogo } from './CuMealsLogo';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      setShowIOSModal(true);
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      <div className="mb-4 p-4 rounded-[22px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-500/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <CuMealsLogo size="sm" rounded="rounded-xl" />

          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Install CuMeals App</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-extrabold uppercase">
                Web App
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              1-tap access on Home Screen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95 transition-all"
          >
            <Download size={13} strokeWidth={2.5} />
            <span>Install</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS / Browser Install Help Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-[#131722] border border-slate-100 dark:border-slate-800 p-6 shadow-2xl relative space-y-4">
            
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                <Smartphone size={28} />
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Install as Mobile App
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Follow these simple steps to install CuMeals onto your home screen:
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    Tap the Share or Menu button <Share size={13} className="text-indigo-400 inline" />
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Located at the bottom of Safari or top-right of Chrome (⋮)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    Select "Add to Home Screen" <PlusSquare size={13} className="text-emerald-400 inline" />
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Or "Install App" in your mobile browser options
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 mt-2"
            >
              Got it!
            </button>

          </div>
        </div>
      )}
    </>
  );
};
