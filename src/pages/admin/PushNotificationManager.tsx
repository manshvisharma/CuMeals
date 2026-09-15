import React, { useState, useEffect } from 'react';
import { 
  Send, BellRing, Smartphone, Users, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, Clock, Calendar, CheckSquare, Sparkles, Coffee, 
  Sun, Moon, Cookie, Info
} from 'lucide-react';
import { getAllPushSubscribers } from '../../utils/pushNotifications';
import { db } from '../../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import { fetchTimings, fetchMenuForDate } from '../../firebase/firestore';
import { getTodayString, getTodayDayOfWeek } from '../../utils/dateUtils';
import { DailyMenu, MealTimings } from '../../types';

export const PushNotificationManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Active Mode: 'broadcast' (manual instant) | 'upcoming' (smart meal alerts)
  const [activeMode, setActiveMode] = useState<'broadcast' | 'upcoming'>('upcoming');

  // Broadcast Form State
  const [title, setTitle] = useState('CuMeals Mess Update 🍲');
  const [body, setBody] = useState('Today\'s hostel meal menu and timings have been updated. Tap to view!');
  const [url, setUrl] = useState('/');
  const [statusResult, setStatusResult] = useState<{
    success: boolean;
    message: string;
    sent?: number;
    failed?: number;
  } | null>(null);

  // Upcoming Meal Automation State
  const [menuToday, setMenuToday] = useState<DailyMenu | null>(null);
  const [timings, setTimings] = useState<MealTimings | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  
  // Selected target meal for the upcoming alert
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'snacks' | 'dinner'>('lunch');
  // Selected timing interval: 60m (1 hr before), 30m (30 mins before), or multiple
  const [leadTimes, setLeadTimes] = useState<number[]>([30]); // [60], [30], or [60, 30]

  const fetchSubscribers = async () => {
    setLoading(true);
    const subs = await getAllPushSubscribers();
    setSubscribers(subs);
    setLoading(false);
  };

  const loadMenuAndTimings = async () => {
    setLoadingMenu(true);
    try {
      const todayStr = getTodayString();
      const todayDay = getTodayDayOfWeek();
      const [mToday, tData] = await Promise.all([
        fetchMenuForDate(todayStr).then(res => res || fetchMenuForDate(todayDay)),
        fetchTimings()
      ]);
      setMenuToday(mToday);
      setTimings(tData);
    } catch (err) {
      console.error('Error loading menu/timings for push manager:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
    loadMenuAndTimings();
  }, []);

  // Quick manual broadcast templates
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

  // Toggle lead times (e.g. 60 min, 30 min, or both)
  const toggleLeadTime = (mins: number) => {
    setLeadTimes(prev => {
      if (prev.includes(mins)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter(t => t !== mins);
      } else {
        return [...prev, mins].sort((a, b) => b - a);
      }
    });
  };

  // Generate automated message content based on selected meal & snacks criteria
  const getMealAlertContent = () => {
    const leadTimeStr = leadTimes.length === 2
      ? '1 Hour & 30 Mins'
      : (leadTimes[0] === 60 ? '1 Hour' : '30 Minutes');

    if (selectedMeal === 'breakfast') {
      const items = menuToday?.breakfast?.items?.slice(0, 4).join(', ') || 'Fresh Breakfast & Tea';
      const time = timings?.breakfast || '7:30 AM - 9:30 AM';
      return {
        title: `Breakfast in ${leadTimeStr} 🌅 (${time})`,
        body: `Items: ${items}. Mess dining hall opens soon!`
      };
    }

    if (selectedMeal === 'lunch') {
      const items = menuToday?.lunch?.items?.slice(0, 4).join(', ') || 'Dal, Sabzi, Roti, Rice';
      const time = timings?.lunch || '12:30 PM - 2:30 PM';
      return {
        title: `Lunch in ${leadTimeStr} 🍛 (${time})`,
        body: `Menu: ${items}. Get ready for lunch!`
      };
    }

    if (selectedMeal === 'snacks') {
      // Both Boys & Girls snacks items explicitly included
      const boysItems = menuToday?.snacksBoys?.items?.slice(0, 3).join(', ') || 'Tea & Snacks';
      const girlsItems = menuToday?.snacksGirls?.items?.slice(0, 3).join(', ') || 'Tea & Snacks';
      const boysTime = timings?.snacksBoys || '5:00 PM - 6:00 PM';
      const girlsTime = timings?.snacksGirls || '5:00 PM - 6:00 PM';

      const isSameItems = boysItems.toLowerCase() === girlsItems.toLowerCase();

      return {
        title: `Evening Snacks in ${leadTimeStr} ☕`,
        body: isSameItems 
          ? `Snacks: ${boysItems} (Boys & Girls Mess: ${boysTime})`
          : `Boys Mess: ${boysItems} (${boysTime}) | Girls Mess: ${girlsItems} (${girlsTime})`
      };
    }

    if (selectedMeal === 'dinner') {
      const items = menuToday?.dinner?.items?.slice(0, 4).join(', ') || 'Special Dinner & Sweet Dish';
      const time = timings?.dinner || '7:30 PM - 9:30 PM';
      return {
        title: `Dinner in ${leadTimeStr} 🌙 (${time})`,
        body: `Today's Dinner: ${items}. Served until closing!`
      };
    }

    return {
      title: 'Upcoming Mess Meal Alert 🍲',
      body: 'Upcoming meal will start shortly. Check menu and timings in CuMeals.'
    };
  };

  const autoPreview = getMealAlertContent();

  const handleBroadcast = async (customTitle?: string, customBody?: string) => {
    const finalTitle = customTitle || title;
    const finalBody = customBody || body;

    if (!finalTitle.trim() || !finalBody.trim()) return;

    if (subscribers.length === 0) {
      setStatusResult({
        success: false,
        message: 'No student devices are subscribed yet. Once students click "Enable Push Notifications" on their phones, they will receive notifications here.'
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
          title: finalTitle,
          body: finalBody,
          url: '/'
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
    <div className="space-y-6 animate-fadeIn">
      {/* Subscribers Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subscribed Devices</p>
            <h3 className="text-2xl font-black text-white mt-1">
              {loading ? '...' : subscribers.length}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Ready for real-time push</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users size={24} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Device Breakdown</p>
            <p className="text-sm font-bold text-slate-200 mt-1">
              iOS PWA: <span className="text-indigo-400">{iosCount}</span> • Android: <span className="text-emerald-400">{androidCount}</span>
            </p>
            <p className="text-[11px] text-slate-400 font-medium">Other / Desktop: {otherCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Smartphone size={24} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Push Gateway Status</p>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active & VAPID Ready
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Safari iOS 16.4+ & Chrome</p>
          </div>
          <button
            onClick={fetchSubscribers}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-slate-700/60"
            title="Refresh subscriber count"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs: Upcoming Meal Alerts vs Normal Broadcast */}
      <div className="flex rounded-2xl bg-slate-900/90 border border-slate-800 p-1.5 shadow-sm">
        <button
          onClick={() => setActiveMode('upcoming')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'upcoming'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock size={16} />
          <span>Upcoming Meal Alerts (30m / 1h Before)</span>
        </button>

        <button
          onClick={() => setActiveMode('broadcast')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'broadcast'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BellRing size={16} />
          <span>General Manual Notification</span>
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODE 1: UPCOMING MEAL NOTIFICATION SCHEDULER & DISPATCHER */}
      {/* ---------------------------------------------------- */}
      {activeMode === 'upcoming' && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Clock size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Send Upcoming Meal Notification</h2>
                <p className="text-xs text-slate-400">
                  Notify all students 30 minutes and/or 1 hour before meal service with exact menu dishes & timings.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Select Target Meal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <span>1. Select Upcoming Meal</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'breakfast', label: 'Breakfast', icon: Sun, color: 'text-amber-400' },
                { id: 'lunch', label: 'Lunch', icon: Coffee, color: 'text-emerald-400' },
                { id: 'snacks', label: 'Snacks (Boys & Girls)', icon: Cookie, color: 'text-indigo-400' },
                { id: 'dinner', label: 'Dinner', icon: Moon, color: 'text-purple-400' }
              ].map((m) => {
                const Icon = m.icon;
                const isSel = selectedMeal === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMeal(m.id as any)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSel 
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-md shadow-indigo-600/20 text-white' 
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Icon size={18} className={isSel ? 'text-indigo-400' : m.color} />
                      {isSel && <CheckCircle2 size={16} className="text-indigo-400" />}
                    </div>
                    <span className="text-xs font-bold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Lead Times (Multiple option: 30 min, 1 hour, or both) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                2. Advance Alert Timing (Select one or multiple)
              </label>
              <span className="text-[11px] text-slate-400">Can select both 1 hr & 30 min</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => toggleLeadTime(60)}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                  leadTimes.includes(60)
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>1 Hour Before (60 min)</span>
                </div>
                {leadTimes.includes(60) ? <CheckSquare size={16} className="text-indigo-400" /> : <span className="w-4 h-4 rounded border border-slate-600" />}
              </button>

              <button
                type="button"
                onClick={() => toggleLeadTime(30)}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                  leadTimes.includes(30)
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>30 Mins Before</span>
                </div>
                {leadTimes.includes(30) ? <CheckSquare size={16} className="text-indigo-400" /> : <span className="w-4 h-4 rounded border border-slate-600" />}
              </button>

              <button
                type="button"
                onClick={() => setLeadTimes([60, 30])}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all col-span-2 sm:col-span-1 ${
                  leadTimes.length === 2
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                    : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Sparkles size={16} className="text-purple-400" />
                <span>Both (1h & 30m Alerts)</span>
              </button>
            </div>
          </div>

          {/* Snacks Special Notice Box */}
          {selectedMeal === 'snacks' && (
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
              <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Dual-Hostel Snacks Broadcast: </span>
                As requested, snacks alerts automatically package both <b>Boys Mess</b> and <b>Girls Mess</b> items and timings in the notification body so all students get their respective menu clearly.
              </div>
            </div>
          )}

          {/* Notification Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-slate-400">
              <span>Live Push Notification Preview</span>
              <span className="text-emerald-400">Lock Screen Card</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/70 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <BellRing size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white truncate">{autoPreview.title}</p>
                  <span className="text-[10px] text-slate-400">now</span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{autoPreview.body}</p>
              </div>
            </div>
          </div>

          {/* Dispatch Status */}
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

          {/* Action Trigger Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => handleBroadcast(autoPreview.title, autoPreview.body)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Dispatching Meal Alert...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>
                    Send Upcoming Meal Alert ({subscribers.length} Devices)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODE 2: CUSTOM MANUAL BROADCAST COMPOSER */}
      {/* ---------------------------------------------------- */}
      {activeMode === 'broadcast' && (
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Broadcast Custom Push Notification</h2>
              <p className="text-xs text-slate-400">
                Delivers custom announcements directly to the lock screen and notification tray of student phones.
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
          <form onSubmit={(e) => { e.preventDefault(); handleBroadcast(); }} className="space-y-4">
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
      )}
    </div>
  );
};
