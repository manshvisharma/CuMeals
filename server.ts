import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// VAPID Configuration for Web Push (iOS 16.4+ Safari PWA & Android Chrome)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMw-6JzSeK_hA_1oQL4IuE8SCv8KK2jjbLuDLJIxfkEll1qoVMW_8Xx4fS2nF8tKZe4VAec7b3y34ok61zpQ4As";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "2hmlKG6KQCeO8Z-a-oiD2kYvMxDo3S8Xhqk3yL4aJaM";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@cumeals.app";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Push Server] VAPID configured successfully');
} catch (e) {
  console.error('[Push Server] Error configuring VAPID:', e);
}

// ----------------------------------------------------
// SUBSCRIBER REGISTRY & NORMALIZATION
// ----------------------------------------------------
export interface RegisteredSubscriber {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceType: 'ios' | 'android' | 'desktop';
  isStandalone?: boolean;
  userId?: string;
  userEmail?: string;
  userName?: string;
  updatedAt: string;
  createdAt?: string;
}

const serverSubscribers = new Map<string, RegisteredSubscriber>();

function normalizeDeviceType(sub: any): 'ios' | 'android' | 'desktop' {
  const endpoint = String(sub?.endpoint || '').toLowerCase();
  const rawType = String(sub?.deviceType || '').toLowerCase();

  if (rawType === 'ios' || endpoint.includes('apple.com') || endpoint.includes('push.apple.com')) {
    return 'ios';
  }
  if (rawType === 'android' || endpoint.includes('fcm.googleapis.com') || endpoint.includes('google.com')) {
    return 'android';
  }
  return 'desktop';
}

// ----------------------------------------------------
// AUTOMATED MEAL NOTIFICATION ENGINE & CACHE
// ----------------------------------------------------
interface AutomationSettings {
  enabled: boolean;
  notify1HourBefore: boolean;    // "Dinner in 1 hour"
  notifyOnStart: boolean;        // "Dinner Started! 🌙"
  notify30MinBeforeEnd: boolean; // "Dinner ending in 30m ⏰ - Go and take your meal!"
  meals: {
    breakfast: boolean;
    lunch: boolean;
    snacks: boolean;
    dinner: boolean;
  };
}

let automationSettings: AutomationSettings = {
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
};

let cachedTimings = {
  breakfast: "7:30 AM - 9:30 AM",
  lunch: "12:30 PM - 2:30 PM",
  snacksBoys: "5:00 PM - 6:00 PM",
  snacksGirls: "5:00 PM - 6:00 PM",
  dinner: "7:30 PM - 9:30 PM"
};

let cachedMenus: Record<string, any> = {};

// History of triggered alerts to prevent duplicate notifications on the same day
const sentAlertKeys = new Set<string>();
const sentAlertsHistory: Array<{
  id: string;
  key: string;
  timestamp: string;
  meal: string;
  type: string;
  title: string;
  body: string;
  sentCount: number;
  failedCount: number;
}> = [];

// Helper: Parse time string like "7:30 PM" to minutes from midnight
function parseTimeToMinutes(timePart: string): number | null {
  try {
    const match = timePart.trim().match(/(\d+):(\d+)\s*(AM|PM|am|pm)/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch {
    return null;
  }
}

// Helper: Get Indian Standard Time (IST) details
function getISTDate() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long'
  });
  const parts = formatter.formatToParts(now);
  const obj: Record<string, string> = {};
  parts.forEach(p => obj[p.type] = p.value);
  const year = obj.year;
  const month = obj.month;
  const day = obj.day;
  const hours = parseInt(obj.hour, 10);
  const minutes = parseInt(obj.minute, 10);
  const seconds = parseInt(obj.second, 10);
  const dayOfWeek = (obj.weekday || 'Monday').toLowerCase();
  const dateStr = `${year}-${month}-${day}`;
  const currentMins = hours * 60 + minutes;

  return {
    dateStr,
    dayOfWeek,
    hours,
    minutes,
    seconds,
    currentMins,
    istFormatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} IST (${dateStr})`
  };
}

// Helper to broadcast notification to all registered student devices
async function broadcastPush(title: string, body: string, tag: string) {
  const subs = Array.from(serverSubscribers.values());
  if (subs.length === 0) {
    console.log('[AutoPush] No subscribers registered yet.');
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    url: '/',
    tag
  });

  const pushOptions = {
    TTL: 86400, // 24 hours
    urgency: 'high' as const,
    topic: tag
  };

  let sentCount = 0;
  let failCount = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        const targetSub = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };
        await webpush.sendNotification(targetSub, payload, pushOptions);
        sentCount++;
      } catch (err: any) {
        failCount++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  // Remove expired subscriptions
  for (const exp of expiredEndpoints) {
    serverSubscribers.delete(exp);
  }

  console.log(`[AutoPush Dispatched] "${title}" -> ${sentCount} sent, ${failCount} failed.`);
  return { sent: sentCount, failed: failCount };
}

// Helper: Get formatted menu items for today
function getTodayMenuItems(mealKey: 'breakfast' | 'lunch' | 'snacks' | 'dinner', dateStr: string, dayOfWeek: string) {
  const menu = cachedMenus[dateStr] || cachedMenus[dayOfWeek];
  if (!menu) {
    if (mealKey === 'breakfast') return 'Aloo Paratha, Curd, Tea & Bread Butter';
    if (mealKey === 'lunch') return 'Dal Makhani, Seasonal Sabzi, Roti, Rice & Salad';
    if (mealKey === 'snacks') return 'Tea & Crispy Samosa / Pakoda';
    if (mealKey === 'dinner') return 'Paneer Butter Masala, Dal Tadka, Roti, Jeera Rice & Sweet';
  }

  if (mealKey === 'breakfast') {
    return menu.breakfast?.items?.slice(0, 4).join(', ') || 'Breakfast & Tea';
  }
  if (mealKey === 'lunch') {
    return menu.lunch?.items?.slice(0, 4).join(', ') || 'Lunch Menu';
  }
  if (mealKey === 'snacks') {
    const boys = menu.snacksBoys?.items?.slice(0, 3).join(', ') || 'Tea & Snacks';
    const girls = menu.snacksGirls?.items?.slice(0, 3).join(', ') || 'Tea & Snacks';
    return boys.toLowerCase() === girls.toLowerCase() ? boys : `Boys: ${boys} | Girls: ${girls}`;
  }
  if (mealKey === 'dinner') {
    return menu.dinner?.items?.slice(0, 4).join(', ') || 'Dinner & Sweet Dish';
  }
  return 'Mess meal is ready';
}

// Automated check loop executed every 30 seconds
async function checkAndSendMealAlerts() {
  if (!automationSettings.enabled) return;

  const ist = getISTDate();
  const { dateStr, dayOfWeek, currentMins } = ist;

  // Meal timing definitions
  const mealConfigs = [
    {
      id: 'breakfast',
      name: 'Breakfast',
      emoji: '🌅',
      timeRange: cachedTimings.breakfast,
      enabled: automationSettings.meals.breakfast
    },
    {
      id: 'lunch',
      name: 'Lunch',
      emoji: '🍛',
      timeRange: cachedTimings.lunch,
      enabled: automationSettings.meals.lunch
    },
    {
      id: 'snacks',
      name: 'Snacks',
      emoji: '☕',
      timeRange: cachedTimings.snacksBoys || cachedTimings.snacksGirls || "5:00 PM - 6:00 PM",
      enabled: automationSettings.meals.snacks
    },
    {
      id: 'dinner',
      name: 'Dinner',
      emoji: '🌙',
      timeRange: cachedTimings.dinner,
      enabled: automationSettings.meals.dinner
    }
  ];

  for (const meal of mealConfigs) {
    if (!meal.enabled) continue;

    const parts = (meal.timeRange || '').split(/[-–—]|to/i);
    if (parts.length < 2) continue;

    const startMins = parseTimeToMinutes(parts[0]);
    const endMins = parseTimeToMinutes(parts[1]);
    if (startMins === null || endMins === null) continue;

    const items = getTodayMenuItems(meal.id as any, dateStr, dayOfWeek);
    const endTimeLabel = parts[1].trim();

    // TRIGGER 1: 1 HOUR BEFORE MEAL STARTS (e.g. Dinner starts at 7:30 PM -> Send at 6:30 PM)
    if (automationSettings.notify1HourBefore) {
      const triggerTime = startMins - 60;
      const key = `${dateStr}_${meal.id}_1h_before`;

      // Trigger window: triggerTime <= currentMins < triggerTime + 5
      if (currentMins >= triggerTime && currentMins < triggerTime + 5 && !sentAlertKeys.has(key)) {
        sentAlertKeys.add(key);

        // Keep heading short as requested: "Dinner in 1 hour"
        const title = `${meal.name} in 1 hour`;
        const body = `Menu: ${items}. Timings: ${meal.timeRange}`;
        const tag = `cumeals-${meal.id}-1h-${dateStr}`;

        const res = await broadcastPush(title, body, tag);
        sentAlertsHistory.unshift({
          id: `alert_${Date.now()}`,
          key,
          timestamp: ist.istFormatted,
          meal: meal.name,
          type: '1 Hour Before',
          title,
          body,
          sentCount: res.sent,
          failedCount: res.failed
        });
      }
    }

    // TRIGGER 2: ON MEAL START (e.g. Dinner starts at 7:30 PM -> Send instantly at 7:30 PM)
    if (automationSettings.notifyOnStart) {
      const triggerTime = startMins;
      const key = `${dateStr}_${meal.id}_started`;

      if (currentMins >= triggerTime && currentMins < triggerTime + 5 && !sentAlertKeys.has(key)) {
        sentAlertKeys.add(key);

        // Short heading: "Dinner Started! 🌙"
        const title = `${meal.name} Started! ${meal.emoji}`;
        const body = `Fresh meal is now being served in dining hall! Menu: ${items}`;
        const tag = `cumeals-${meal.id}-started-${dateStr}`;

        const res = await broadcastPush(title, body, tag);
        sentAlertsHistory.unshift({
          id: `alert_${Date.now()}`,
          key,
          timestamp: ist.istFormatted,
          meal: meal.name,
          type: 'Meal Started',
          title,
          body,
          sentCount: res.sent,
          failedCount: res.failed
        });
      }
    }

    // TRIGGER 3: 30 MINS BEFORE MEAL ENDS (e.g. Dinner ends at 9:30 PM -> Send at 9:00 PM: "Dinner ending in 30m ⏰")
    if (automationSettings.notify30MinBeforeEnd) {
      const triggerTime = endMins - 30;
      const key = `${dateStr}_${meal.id}_30m_before_end`;

      if (currentMins >= triggerTime && currentMins < triggerTime + 5 && !sentAlertKeys.has(key)) {
        sentAlertKeys.add(key);

        // Short heading: "Dinner ending in 30m ⏰"
        const title = `${meal.name} ending in 30m ⏰`;
        const body = `Go and take your meal before the mess closes! (Closes at ${endTimeLabel})`;
        const tag = `cumeals-${meal.id}-closing-30m-${dateStr}`;

        const res = await broadcastPush(title, body, tag);
        sentAlertsHistory.unshift({
          id: `alert_${Date.now()}`,
          key,
          timestamp: ist.istFormatted,
          meal: meal.name,
          type: '30 Min Before End',
          title,
          body,
          sentCount: res.sent,
          failedCount: res.failed
        });
      }
    }
  }

  // Keep sent history trimmed to latest 50 entries
  if (sentAlertsHistory.length > 50) {
    sentAlertsHistory.length = 50;
  }
}

// Start automated cron/interval runner every 30 seconds
setInterval(() => {
  checkAndSendMealAlerts().catch(err => console.error('[AutoPush Scheduler Error]:', err));
}, 30000);

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  const ist = getISTDate();
  res.json({
    status: 'ok',
    serverTimeIST: ist.istFormatted,
    subscribersCount: serverSubscribers.size,
    automationEnabled: automationSettings.enabled
  });
});

// Get Public VAPID Key for client subscriptions
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Register / update a subscription directly on server
app.post('/api/register-subscription', (req, res) => {
  const sub = req.body;
  if (sub && sub.endpoint && sub.keys) {
    const deviceType = normalizeDeviceType(sub);
    const record: RegisteredSubscriber = {
      endpoint: sub.endpoint,
      keys: sub.keys,
      deviceType,
      isStandalone: Boolean(sub.isStandalone),
      userId: sub.userId || 'anonymous',
      userEmail: sub.userEmail || 'Anonymous Student',
      userName: sub.userName || 'Student',
      updatedAt: sub.updatedAt || new Date().toISOString(),
      createdAt: sub.createdAt || new Date().toISOString()
    };

    serverSubscribers.set(sub.endpoint, record);
    console.log(`[Push Server] Registered subscriber [${deviceType}] (Total: ${serverSubscribers.size})`);
    return res.json({ success: true, count: serverSubscribers.size, deviceType });
  }
  return res.status(400).json({ error: 'Invalid subscription data' });
});

// Get all subscribers from server registry
app.get('/api/subscribers', (req, res) => {
  const subs = Array.from(serverSubscribers.values()).map(s => ({
    ...s,
    deviceType: normalizeDeviceType(s)
  }));

  const ios = subs.filter(s => s.deviceType === 'ios').length;
  const android = subs.filter(s => s.deviceType === 'android').length;
  const desktop = subs.length - ios - android;

  res.json({
    success: true,
    count: subs.length,
    deviceStats: { ios, android, desktop, total: subs.length },
    subscribers: subs
  });
});

// Get Automation Status & Settings
app.get('/api/automation-status', (req, res) => {
  const ist = getISTDate();
  const subs = Array.from(serverSubscribers.values()).map(s => ({
    ...s,
    deviceType: normalizeDeviceType(s)
  }));
  const ios = subs.filter(s => s.deviceType === 'ios').length;
  const android = subs.filter(s => s.deviceType === 'android').length;
  const desktop = subs.length - ios - android;

  res.json({
    success: true,
    settings: automationSettings,
    timings: cachedTimings,
    serverTimeIST: ist.istFormatted,
    currentMinutesIST: ist.currentMins,
    subscribersCount: subs.length,
    deviceBreakdown: { ios, android, desktop, total: subs.length },
    recentAlerts: sentAlertsHistory.slice(0, 15)
  });
});

// Update Automation Settings
app.post('/api/automation-settings', (req, res) => {
  const newSettings = req.body;
  if (typeof newSettings === 'object' && newSettings !== null) {
    automationSettings = {
      ...automationSettings,
      ...newSettings,
      meals: {
        ...automationSettings.meals,
        ...(newSettings.meals || {})
      }
    };
    return res.json({ success: true, settings: automationSettings });
  }
  return res.status(400).json({ error: 'Invalid settings object' });
});

// Sync Menu & Timings Cache from Frontend/Firestore
app.post('/api/sync-menu-timings', (req, res) => {
  const { timings, menus } = req.body || {};
  if (timings) {
    cachedTimings = { ...cachedTimings, ...timings };
  }
  if (menus && typeof menus === 'object') {
    cachedMenus = { ...cachedMenus, ...menus };
  }
  res.json({ success: true, cachedTimings, menuKeysCount: Object.keys(cachedMenus).length });
});

// Trigger Instant Meal Alert (Manual testing or on-demand dispatch)
app.post('/api/trigger-meal-alert', async (req, res) => {
  const { meal, type, customTitle, customBody } = req.body || {};
  const ist = getISTDate();
  const mealId = (meal || 'dinner').toLowerCase();

  const mealName = mealId.charAt(0).toUpperCase() + mealId.slice(1);
  const timeRange = cachedTimings[mealId === 'snacks' ? 'snacksBoys' : (mealId as keyof typeof cachedTimings)] || "7:30 PM - 9:30 PM";
  const parts = timeRange.split(/[-–—]|to/i);
  const endTimeLabel = parts.length > 1 ? parts[1].trim() : 'closing time';
  const items = getTodayMenuItems(mealId as any, ist.dateStr, ist.dayOfWeek);

  let title = customTitle || '';
  let body = customBody || '';

  if (!title) {
    if (type === '1hour_before') {
      title = `${mealName} in 1 hour`;
      body = `Menu: ${items}. Timings: ${timeRange}`;
    } else if (type === 'start') {
      const emoji = mealId === 'breakfast' ? '🌅' : mealId === 'lunch' ? '🍛' : mealId === 'snacks' ? '☕' : '🌙';
      title = `${mealName} Started! ${emoji}`;
      body = `Fresh meal is now being served in dining hall! Menu: ${items}`;
    } else if (type === '30min_before_end') {
      title = `${mealName} ending in 30m ⏰`;
      body = `Go and take your meal before the mess closes! (Closes at ${endTimeLabel})`;
    } else {
      title = `${mealName} Alert 🍲`;
      body = `Menu: ${items}. Mess timings: ${timeRange}`;
    }
  }

  const tag = `cumeals-manual-${mealId}-${Date.now()}`;
  const dispatchResult = await broadcastPush(title, body, tag);

  sentAlertsHistory.unshift({
    id: `alert_manual_${Date.now()}`,
    key: `manual_${mealId}_${Date.now()}`,
    timestamp: ist.istFormatted,
    meal: mealName,
    type: type || 'Manual Alert',
    title,
    body,
    sentCount: dispatchResult.sent,
    failedCount: dispatchResult.failed
  });

  res.json({
    success: true,
    title,
    body,
    sent: dispatchResult.sent,
    failed: dispatchResult.failed,
    total: serverSubscribers.size
  });
});

// Test push notification to a specific client subscription
app.post('/api/test-push', async (req, res) => {
  const { subscription, title, body, url, tag } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing push subscription object' });
  }

  const payload = JSON.stringify({
    title: title || 'CuMeals Mess Alert 🔔',
    body: body || 'Test push notification delivered directly to your device!',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    url: url || '/',
    tag: tag || 'cumeals-test'
  });

  const pushOptions = {
    TTL: 86400,
    urgency: 'high' as const,
    topic: tag || 'cumeals-test'
  };

  try {
    const result = await webpush.sendNotification(subscription, payload, pushOptions);
    res.json({ success: true, statusCode: result.statusCode });
  } catch (error: any) {
    console.error('[Push Server] Test push error:', error?.statusCode, error?.message);
    res.status(error?.statusCode || 500).json({
      success: false,
      error: error?.message || 'Failed to send push notification',
      statusCode: error?.statusCode
    });
  }
});

// Broadcast push notification to multiple student devices
app.post('/api/send-push', async (req, res) => {
  const { subscriptions, title, body, url, tag } = req.body;

  if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res.status(400).json({ error: 'Subscriptions array is required and must not be empty' });
  }

  const payload = JSON.stringify({
    title: title || 'CuMeals Notice Board',
    body: body || 'New announcement posted for hostel mess.',
    icon: '/icon-192.png',
    badge: '/favicon.png',
    url: url || '/',
    tag: tag || `cumeals-notice-${Date.now()}`
  });

  const pushOptions = {
    TTL: 86400,
    urgency: 'high' as const,
    topic: tag || 'cumeals-broadcast'
  };

  let sentCount = 0;
  let failCount = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        const targetSub = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };
        await webpush.sendNotification(targetSub, payload, pushOptions);
        sentCount++;
      } catch (err: any) {
        failCount++;
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  for (const exp of expiredEndpoints) {
    serverSubscribers.delete(exp);
  }

  res.json({
    success: true,
    total: subscriptions.length,
    sent: sentCount,
    failed: failCount,
    expiredEndpoints
  });
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CuMeals Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[CuMeals Server] Startup failure:', err);
});
