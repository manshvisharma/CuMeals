import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { getPushStatus, subscribeToPushNotifications, PushStatus } from '../utils/pushNotifications';
import { User } from 'firebase/auth';

interface NotificationPromptBannerProps {
  currentUser: User | null;
}

export const NotificationPromptBanner: React.FC<NotificationPromptBannerProps> = ({ currentUser }) => {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [showIOSTip, setShowIOSTip] = useState<boolean>(false);

  useEffect(() => {
    const s = getPushStatus();
    setStatus(s);

    const isDismissed = localStorage.getItem('cumeals_push_banner_dismissed') === 'true';
    if (!s.isSubscribed && !isDismissed && s.isSupported) {
      setDismissed(false);
    }
  }, []);

  if (!status || dismissed || status.isSubscribed || !status.isSupported) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('cumeals_push_banner_dismissed', 'true');
  };

  const handleEnable = async () => {
    if (status.isIOS && !status.isStandalone) {
      setShowIOSTip(true);
      return;
    }

    setLoading(true);
    const res = await subscribeToPushNotifications(currentUser);
    setLoading(false);

    if (res.success) {
      setStatus(getPushStatus());
      setDismissed(true);
    } else if (res.requiresPWAInstall) {
      setShowIOSTip(true);
    }
  };

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/40 border border-indigo-500/20 p-3.5 shadow-sm text-slate-800 dark:text-slate-200 animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <Bell size={16} strokeWidth={2.4} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Enable Meal Alerts</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                New
              </span>
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
              Get lock screen notifications for lunch/dinner timings & menu changes even when the app is closed.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>

      {showIOSTip && (
        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300">
          <p className="font-bold flex items-center gap-1">
            <Smartphone size={13} />
            <span>Apple iOS Setup Step</span>
          </p>
          <p className="mt-0.5 text-amber-900 dark:text-amber-200/90 leading-tight">
            Tap Safari's <strong>Share</strong> button and choose <strong>"Add to Home Screen"</strong>. Open CuMeals from your home screen to activate notifications.
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={handleDismiss}
          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2.5 py-1.5"
        >
          Maybe Later
        </button>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} strokeWidth={2.8} />}
          <span>{status.isIOS && !status.isStandalone ? 'How to Enable on iPhone' : 'Turn On Alerts'}</span>
        </button>
      </div>
    </div>
  );
};
