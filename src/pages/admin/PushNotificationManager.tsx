import React, { useState, useEffect } from 'react';
import { Send, BellRing, Smartphone, Users, CheckCircle2, AlertTriangle, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { getAllPushSubscribers } from '../../utils/pushNotifications';
import { db } from '../../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';

export const PushNotificationManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [title, setTitle] = useState('CuMeals Mess Update 🍲');
  const [body, setBody] = useState('Today\'s hostel meal menu and timings have been updated. Tap to view!');
  const [url, setUrl] = useState('/');
  const [statusResult, setStatusResult] = useState<{
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
  } | null>(null);

  const fetchSubscribers = async () => {
    setLoading(true);
    const subs = await getAllPushSubscribers();
    setSubscribers(subs);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const templates = [
    {
      label: '🍲 Meal is Ready',
      title: 'Mess Meal is Ready! 🍲',
      body: 'Today\'s freshly prepared meal is now being served in the dining hall. Come grab your plate!',
      url: '/'
    },
    {
      label: '⏰ Timing Change',
      title: 'Important: Mess Timings Changed ⏰',
      body: 'Please note today\'s updated meal timings before heading to the mess.',
      url: '/'
    },
    {
      label: '🎉 Special Weekend Menu',
      title: 'Special Feast Today! 🎉',
      body: 'Special dishes have been prepared today! Open CuMeals to view today\'s menu items.',
      url: '/'
    },
    {
      label: '📢 Notice Board',
      title: 'New Mess Notice Posted 📢',
      body: 'The mess administration has published a new important announcement.',
      url: '/'
    }
  ];

  const handleApplyTemplate = (tmpl: typeof templates[0]) => {
    setTitle(tmpl.title);
    setBody(tmpl.body);
    setUrl(tmpl.url);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    if (subscribers.length === 0) {
      setStatusResult({
        success: false,
        message: 'No student devices are subscribed yet. Once students click "Enable Push Notifications" on their phones, they will appear here.'
      });
      return;
    }

    setSending(true);
    setStatusResult(null);

    try {
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptions: subscribers,
          title,
          body,
          url
        })
      });

      const data = await res.json();

      if (data.success) {
        setStatusResult({
          success: true,
          message: `Broadcast successfully pushed! Delivered to ${data.sent} device(s).`,
          sent: data.sent,
          failed: data.failed
        });

        // Clean up expired tokens if any
        if (data.expiredEndpoints && data.expiredEndpoints.length > 0) {
          for (const sub of subscribers) {
            if (data.expiredEndpoints.includes(sub.endpoint)) {
              try {
                await deleteDoc(doc(db, 'push_subscriptions', sub.id));
              } catch (err) {
                console.error('Error removing expired subscription', err);
              }
            }
          }
          await fetchSubscribers();
        }
      } else {
        setStatusResult({
          success: false,
          message: data.error || 'Failed to broadcast notifications.'
        });
      }
    } catch (err: any) {
      setStatusResult({
        success: false,
        message: err?.message || 'Network error while contacting push server.'
      });
    } finally {
      setSending(false);
    }
  };

  const androidCount = subscribers.filter(s => s.deviceType === 'android').length;
  const iosCount = subscribers.filter(s => s.deviceType === 'ios').length;
  const otherCount = subscribers.length - androidCount - iosCount;

  return (
    <div className="space-y-6">
      {/* Subscribers Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Subscribed Devices</p>
            <h3 className="text-2xl font-black text-white mt-1">{loading ? '...' : subscribers.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users size={24} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Device Breakdown</p>
            <p className="text-sm font-bold text-slate-200 mt-1">
              Android: <span className="text-emerald-400">{androidCount}</span> • iOS: <span className="text-indigo-400">{iosCount}</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Smartphone size={24} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Service Worker & VAPID</p>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active & Ready
            </p>
          </div>
          <button
            onClick={fetchSubscribers}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95"
            title="Refresh subscriber count"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Broadcast Composer */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <BellRing size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Broadcast Push Notification to Students</h2>
            <p className="text-xs text-slate-400">
              Delivers directly to the lock screen and notification tray of student phones (Android & iOS PWA), even if the app is closed.
            </p>
          </div>
        </div>

        {/* Quick Templates */}
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Templates
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 hover:text-indigo-300 hover:border-indigo-500/30 border border-slate-700/60 text-xs text-slate-300 font-bold transition-all active:scale-95"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Notification Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mess Meal is Ready! 🍲"
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Notification Message (Body)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. Lunch is now being served in dining hall..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              required
            />
          </div>

          {/* Feedback Status */}
          {statusResult && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 ${
              statusResult.success
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}>
              {statusResult.success ? (
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{statusResult.message}</p>
                {statusResult.sent !== undefined && (
                  <p className="text-[11px] mt-0.5 opacity-90">
                    Successful deliveries: {statusResult.sent} • Failed/unreachable: {statusResult.failed}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Pushing to Student Devices...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Broadcast Notification ({subscribers.length} Devices)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
