import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('To install Mess Menu as a PWA:\n1. Tap Share/Menu in your browser\n2. Select "Add to Home Screen"');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || dismissed) return null;

  return (
    <div className="mb-4 p-4 rounded-[22px] bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 dark:border-indigo-500/30 backdrop-blur-md flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md">
          <Smartphone size={20} />
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Install Mess Menu App
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Add to home screen for fast native experience
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-full bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95"
        >
          <Download size={13} />
          <span>Install</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
