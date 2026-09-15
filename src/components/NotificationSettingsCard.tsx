import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, AlertTriangle, Send, Smartphone, Sparkles, Loader2 } from 'lucide-react';
import { getPushStatus, subscribeToPushNotifications, unsubscribeFromPushNotifications, sendTestPushAlert, PushStatus } from '../utils/pushNotifications';
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
        text: 'Push notifications activated! You will receive alerts even when CuMeals is closed.'
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

  const handleTestNotification = async () => {
    setLoading(true);
    setMessage(null);
    const res = await sendTestPushAlert(
      'CuMeals Mess Alert 🔔',
      'Test notification delivered successfully! Your lock screen alerts are active.'
    );
    setLoading(false);
    setMessage({
      type: res.success ? 'success' : 'error',
      text: res.message
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Lock screen & notification center alerts
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
        Receive real-time notifications for meal timings, upcoming menus, emergency mess notices, and game challenges even when the app is completely closed.
      </p>

      {/* iOS Special Note */}
      {status.isIOS && !status.isStandalone && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
          <Smartphone size={18} className="shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-bold">iOS Home Screen Requirement</p>
            <p className="text-[11px] mt-0.5 text-amber-800 dark:text-amber-400/90 leading-normal">
              Apple requires you to tap <strong>Share</strong> and select <strong>"Add to Home Screen"</strong> first. Open CuMeals from your home screen to enable push notifications.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {!status.isSubscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} strokeWidth={2.4} />}
            <span>Enable Push Notifications</span>
          </button>
        ) : (
          <>
            <button
              onClick={handleTestNotification}
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/60 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
              <span>Send Test Notification</span>
            </button>

            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              title="Turn off notifications"
            >
              <BellOff size={15} />
              <span className="hidden sm:inline">Turn Off</span>
            </button>
          </>
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
