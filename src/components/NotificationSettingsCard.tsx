import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Smartphone, Sparkles, Loader2, Check } from 'lucide-react';
import { getPushStatus, subscribeToPushNotifications, unsubscribeFromPushNotifications, PushStatus } from '../utils/pushNotifications';
import { User } from 'firebase/auth';

interface NotificationSettingsCardProps {
  currentUser: User | null;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({ currentUser }) => {
  const [status, setStatus] = useState<PushStatus>(getPushStatus());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    setStatus(getPushStatus());
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    setMessage(null);

    const result = await subscribeToPushNotifications(currentUser);
    setLoading(false);
    setStatus(getPushStatus());

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Push notifications activated! You will receive meal timings, menu alerts, and closing reminders.'
      });
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Failed to activate notifications.'
      });
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setMessage(null);
    await unsubscribeFromPushNotifications();
    setLoading(false);
    setStatus(getPushStatus());
    setMessage({
      type: 'info',
      text: 'Push notifications turned off on this device.'
    });
  };

  return (
    <div className="rounded-[26px] bg-white dark:bg-[#131722] border border-slate-100 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Bell size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Push Notifications</span>
              {status.isSubscribed && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Automatic lock screen & notification center alerts
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {!status.isSubscribed && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {status.isIOS && !status.isStandalone ? 'PWA Required' : 'Disabled'}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Receive automatic notifications before 1 hour of meal start, when meal begins, and 30 mins before the mess closes, even when CuMeals is closed.
      </p>

      {/* iOS Special Note */}
      {status.isIOS && !status.isStandalone && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
          <Smartphone size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-bold">iPhone / iPad Setup Step</p>
            <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-400/90 leading-normal">
              Apple requires you to tap <strong>Share</strong> and select <strong>"Add to Home Screen"</strong> first. Open CuMeals from your home screen to enable notifications.
            </p>
          </div>
        </div>
      )}

      {/* Action Controls (Clean button without test notification button) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!status.isSubscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} strokeWidth={2.4} />}
            <span>Enable Automatic Meal Alerts</span>
          </button>
        ) : (
          <div className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              <span>Receiving Automatic Schedule Alerts</span>
            </div>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="py-1.5 px-3 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all"
              title="Turn off notifications"
            >
              <BellOff size={13} />
              <span>Turn Off</span>
            </button>
          </div>
        )}
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
            : message.type === 'error'
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}>
          {message.type === 'success' && <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />}
          {message.type === 'error' && <AlertTriangle size={15} className="shrink-0 text-rose-500" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
};
