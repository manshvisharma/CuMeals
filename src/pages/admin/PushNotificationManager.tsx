import React, { useState, useEffect } from 'react';
import { 
  Send, BellRing, Smartphone, Users, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, Clock, Sparkles, Coffee, 
  Sun, Moon, Cookie, Info, Check, ShieldCheck, PlayCircle, Apple
} from 'lucide-react';
import { getAllPushSubscribers } from '../../utils/pushNotifications';
import { db } from '../../firebase/config';
import { doc, deleteDoc } from 'firebase/firestore';
import { fetchTimings, fetchMenuForDate } from '../../firebase/firestore';
import { getTodayString, getTodayDayOfWeek } from '../../utils/dateUtils';
import { DailyMenu, MealTimings, MealAlertSettings } from '../../types';

export const PushNotificationManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Active Tab: 'automatic' (Automatic meal scheduler) | 'broadcast' (Manual custom)
  const [activeTab, setActiveTab] = useState<'automatic' | 'broadcast'>('automatic');

  // Automation Settings State
  const [autoSettings, setAutoSettings] = useState<MealAlertSettings>({
    enabled: true,
    notify1HourBefore: true,
    notifyOnStart: true,
    notify30MinBeforeEnd: true,
    meals: {
      breakfast: true,
      lunch: true,
      snacks: true,
      dinner: true
    }
  });

  const [serverTimeIST, setServerTimeIST] = useState<string>('');
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

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

  // Today's Menu & Timings
  const [menuToday, setMenuToday] = useState<DailyMenu | null>(null);
  const [timings, setTimings] = useState<MealTimings | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const fetchSubscribers = async () => {
    setLoading(true);
    const subs = await getAllPushSubscribers();
    setSubscribers(subs);
    setLoading(false);
  };

  const loadServerStatusAndSettings = async () => {
    try {
      const res = await fetch('/api/automation-status');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setAutoSettings(data.settings);
        }
        if (data.serverTimeIST) {
          setServerTimeIST(data.serverTimeIST);
        }
        if (data.recentAlerts) {
          setRecentLogs(data.recentAlerts);
        }
      }
    } catch (e) {
      console.warn('Could not fetch server automation status', e);
    }
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

      // Sync menu and timings with backend server
      if (tData || mToday) {
        fetch('/api/sync-menu-timings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timings: tData,
            menus: {
              [todayStr]: mToday,
              [todayDay]: mToday
            }
          })
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading menu/timings for push manager:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
    loadServerStatusAndSettings();
    loadMenuAndTimings();

    const timer = setInterval(() => {
      loadServerStatusAndSettings();
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const handleUpdateSetting = async (updater: (prev: MealAlertSettings) => MealAlertSettings) => {
    const updated = updater(autoSettings);
    setAutoSettings(updated);
    try {
      await fetch('/api/automation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error('Failed to sync settings with server', err);
    }
  };

  // Trigger on-demand test alert for specific meal & trigger type
  const handleTriggerMealAlert = async (meal: 'breakfast' | 'lunch' | 'snacks' | 'dinner', type: '1hour_before' | 'start' | '30min_before_end') => {
    setSending(true);
    setStatusResult(null);
    try {
      const res = await fetch('/api/trigger-meal-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal, type })
      });
      const data = await res.json();
      if (data.success) {
        setStatusResult({
          success: true,
          message: `Dispatched "${data.title}" to ${data.sent} device(s)!`,
          sent: data.sent,
          failed: data.failed
        });
        loadServerStatusAndSettings();
      } else {
        setStatusResult({
          success: false,
          message: data.error || 'Failed to dispatch notification.'
        });
      }
    } catch (e: any) {
      setStatusResult({
        success: false,
        message: e?.message || 'Network error triggering alert.'
      });
    } finally {
      setSending(false);
    }
  };

  // Manual broadcast
  const handleBroadcast = async (customTitle?: string, customBody?: string) => {
    const finalTitle = customTitle || title;
    const finalBody = customBody || body;

    if (!finalTitle.trim() || !finalBody.trim()) return;

    if (subscribers.length === 0) {
      setStatusResult({
        success: false,
        message: 'No student devices are subscribed yet. Once students enable notifications on their phones, they will receive notifications here.'
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

  // Calculate device counts with bulletproof iOS & Android recognition
  const iosCount = subscribers.filter(s => 
    s.deviceType === 'ios' || 
    s.endpoint?.toLowerCase().includes('apple.com') || 
    s.endpoint?.toLowerCase().includes('push.apple.com')
  ).length;

  const androidCount = subscribers.filter(s => 
    (s.deviceType === 'android' || s.endpoint?.toLowerCase().includes('fcm.googleapis.com') || s.endpoint?.toLowerCase().includes('google.com')) &&
    !s.endpoint?.toLowerCase().includes('apple.com')
  ).length;

  const desktopCount = Math.max(0, subscribers.length - iosCount - androidCount);

  // Meal timing helpers
  const mealScheduleData = [
    {
      id: 'breakfast' as const,
      name: 'Breakfast',
      icon: Sun,
      color: 'text-amber-400',
      bg: 'from-amber-500/10 to-orange-500/10',
      timeRange: timings?.breakfast || '7:30 AM - 9:30 AM',
      enabled: autoSettings.meals.breakfast,
      items: menuToday?.breakfast?.items?.slice(0, 3).join(', ') || 'Aloo Paratha, Curd, Tea'
    },
    {
      id: 'lunch' as const,
      name: 'Lunch',
      icon: Coffee,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-teal-500/10',
      timeRange: timings?.lunch || '12:30 PM - 2:30 PM',
      enabled: autoSettings.meals.lunch,
      items: menuToday?.lunch?.items?.slice(0, 3).join(', ') || 'Dal Makhani, Seasonal Sabzi, Rice'
    },
    {
      id: 'snacks' as const,
      name: 'Evening Snacks',
      icon: Cookie,
      color: 'text-indigo-400',
      bg: 'from-indigo-500/10 to-purple-500/10',
      timeRange: timings?.snacksBoys || '5:00 PM - 6:00 PM',
      enabled: autoSettings.meals.snacks,
      items: `Boys: ${menuToday?.snacksBoys?.items?.slice(0, 2).join(', ') || 'Tea & Samosa'} | Girls: ${menuToday?.snacksGirls?.items?.slice(0, 2).join(', ') || 'Tea & Snacks'}`
    },
    {
      id: 'dinner' as const,
      name: 'Dinner',
      icon: Moon,
      color: 'text-purple-400',
      bg: 'from-purple-500/10 to-pink-500/10',
      timeRange: timings?.dinner || '7:30 PM - 9:30 PM',
      enabled: autoSettings.meals.dinner,
      items: menuToday?.dinner?.items?.slice(0, 3).join(', ') || 'Paneer Butter Masala, Dal, Roti, Sweet'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Subscribers & Device Breakdown Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Devices */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subscribed Devices</p>
            <h3 className="text-2xl font-black text-white mt-1">
              {loading ? '...' : subscribers.length}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Ready for automated delivery</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Users size={24} />
          </div>
        </div>

        {/* Device Breakdown (iOS & Android accurate stats) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Platform Breakdown</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <span className="text-indigo-400">iOS:</span> {iosCount}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <span className="text-emerald-400">Android:</span> {androidCount}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                <span>Other:</span> {desktopCount}
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
              {iosCount > 0 ? `${iosCount} Apple iPhone/iPad device(s) connected` : 'All registered devices sync in real-time'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Smartphone size={24} />
          </div>
        </div>

        {/* Server Background Scheduler Status */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Automation Status</p>
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {autoSettings.enabled ? 'Automatic Service Active' : 'Service Paused'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {serverTimeIST ? serverTimeIST : 'Checking schedule...'}
            </p>
          </div>
          <button
            onClick={() => { fetchSubscribers(); loadServerStatusAndSettings(); }}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all active:scale-95 border border-slate-700/60"
            title="Refresh subscriber count & status"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex rounded-2xl bg-slate-900/90 border border-slate-800 p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('automatic')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'automatic'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock size={16} />
          <span>Automatic Meal Schedule Notifications (1h Before, Meal Start, 30m Before End)</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'broadcast'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BellRing size={16} />
          <span>General Manual Announcement</span>
        </button>
      </div>

      {/* Feedback Banner */}
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
                Delivered to: {statusResult.sent} device(s) (iOS & Android) • Unreachable: {statusResult.failed}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 1: AUTOMATIC SCHEDULE NOTIFICATION ENGINE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'automatic' && (
        <div className="space-y-6">
          {/* Automation Rules Configuration Card */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Automated Notification Rules</h2>
                  <p className="text-xs text-slate-400">
                    Control which automatic notifications are delivered to student devices based on mess timings.
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <button
                type="button"
                onClick={() => handleUpdateSetting(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  autoSettings.enabled
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${autoSettings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>{autoSettings.enabled ? 'Automation Enabled' : 'Automation Paused'}</span>
              </button>
            </div>

            {/* Notification Trigger Toggles */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                1. Timing Triggers (Select options to automatically send or disable)
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Trigger 1: 1 Hour Before Start */}
                <button
                  type="button"
                  onClick={() => handleUpdateSetting(prev => ({ ...prev, notify1HourBefore: !prev.notify1HourBefore }))}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    autoSettings.notify1HourBefore
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Clock size={15} />
                      1 Hour Before Start
                    </span>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center border text-xs font-bold ${
                      autoSettings.notify1HourBefore ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200">Heading: "Dinner in 1 hour"</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Alerts students 60 minutes before mess opens with today's dish list.
                  </p>
                </button>

                {/* Trigger 2: When Meal Starts */}
                <button
                  type="button"
                  onClick={() => handleUpdateSetting(prev => ({ ...prev, notifyOnStart: !prev.notifyOnStart }))}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    autoSettings.notifyOnStart
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={15} />
                      When Meal Starts
                    </span>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center border text-xs font-bold ${
                      autoSettings.notifyOnStart ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200">Heading: "Dinner Started! 🌙"</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Instantly notifies students that fresh hot meal is ready in dining hall.
                  </p>
                </button>

                {/* Trigger 3: 30 Mins Before Ending */}
                <button
                  type="button"
                  onClick={() => handleUpdateSetting(prev => ({ ...prev, notify30MinBeforeEnd: !prev.notify30MinBeforeEnd }))}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    autoSettings.notify30MinBeforeEnd
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                      <Clock size={15} />
                      30 Mins Before Ending
                    </span>
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center border text-xs font-bold ${
                      autoSettings.notify30MinBeforeEnd ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-200">Heading: "Dinner ending in 30m ⏰"</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Sends "Go and take your meal before the mess closes!" reminder.
                  </p>
                </button>
              </div>
            </div>

            {/* Meal Filter Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                2. Enabled Meals for Automatic Alerts
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'breakfast' as const, label: 'Breakfast', icon: Sun },
                  { key: 'lunch' as const, label: 'Lunch', icon: Coffee },
                  { key: 'snacks' as const, label: 'Snacks (Boys & Girls)', icon: Cookie },
                  { key: 'dinner' as const, label: 'Dinner', icon: Moon }
                ].map(m => {
                  const Icon = m.icon;
                  const isChecked = autoSettings.meals[m.key];
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleUpdateSetting(prev => ({
                        ...prev,
                        meals: { ...prev.meals, [m.key]: !prev.meals[m.key] }
                      }))}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                        isChecked 
                          ? 'bg-slate-800/90 border-indigo-500/50 text-white' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={isChecked ? 'text-indigo-400' : 'text-slate-500'} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </div>
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isChecked ? 'bg-indigo-600 text-white' : 'border border-slate-700'
                      }`}>
                        {isChecked && '✓'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Today's Live Meal Schedule & On-Demand Dispatch Actions */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Today's Meal Alerts & On-Demand Dispatch</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                    Live
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Preview exact notification contents and test-dispatch triggers instantly to all student phones.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealScheduleData.map(meal => {
                const Icon = meal.icon;
                return (
                  <div key={meal.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${meal.bg} flex items-center justify-center border border-slate-700/50`}>
                          <Icon size={16} className={meal.color} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{meal.name}</h4>
                          <span className="text-[11px] text-slate-400 font-medium">{meal.timeRange}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        meal.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {meal.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/60 text-[11px] text-slate-300">
                      <span className="text-slate-400 font-medium">Menu: </span>
                      <span className="font-semibold">{meal.items}</span>
                    </div>

                    {/* Quick Trigger Test Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => handleTriggerMealAlert(meal.id, '1hour_before')}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-[10px] font-bold text-slate-300 hover:text-indigo-200 transition-all flex flex-col items-center justify-center gap-0.5"
                        title="Send 1 Hour Before notification"
                      >
                        <span>1 Hour Before</span>
                        <span className="text-[9px] text-slate-400 font-normal">"{meal.name} in 1 hour"</span>
                      </button>

                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => handleTriggerMealAlert(meal.id, 'start')}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-[10px] font-bold text-slate-300 hover:text-indigo-200 transition-all flex flex-col items-center justify-center gap-0.5"
                        title="Send Meal Started notification"
                      >
                        <span>Meal Start</span>
                        <span className="text-[9px] text-slate-400 font-normal">"{meal.name} Started!"</span>
                      </button>

                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => handleTriggerMealAlert(meal.id, '30min_before_end')}
                        className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-indigo-600/30 hover:border-indigo-500/40 border border-slate-700/60 text-[10px] font-bold text-slate-300 hover:text-indigo-200 transition-all flex flex-col items-center justify-center gap-0.5"
                        title="Send 30 Mins Before Ending reminder"
                      >
                        <span>30m Before End</span>
                        <span className="text-[9px] text-slate-400 font-normal">"Ending in 30m"</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Automatic Notifications Logs */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Recent Automatic Notifications Dispatched by Server
              </h3>
              <span className="text-[11px] text-slate-400">
                {recentLogs.length} logged
              </span>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Automated scheduler is running. Alerts will be automatically logged here as trigger times occur.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recentLogs.map((log, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{log.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">
                          {log.type}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-0.5 truncate">{log.body}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 block">{log.timestamp}</span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        {log.sentCount} sent
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: GENERAL MANUAL BROADCAST COMPOSER */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'broadcast' && (
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
                placeholder="e.g. Mess Notice: Special Dinner Today 🍲"
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
                placeholder="e.g. Please check the updated dinner timings for tonight..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                required
              />
            </div>

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
                    <span>Broadcast Custom Notification ({subscribers.length} Devices)</span>
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
