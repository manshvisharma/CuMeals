import webpush from 'web-push';
import type { Request, Response } from 'express';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMw-6JzSeK_hA_1oQL4IuE8SCv8KK2jjbLuDLJIxfkEll1qoVMW_8Xx4fS2nF8tKZe4VAec7b3y34ok61zpQ4As";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "2hmlKG6KQCeO8Z-a-oiD2kYvMxDo3S8Xhqk3yL4aJaM";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@cumeals.app";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error('VAPID setup error:', e);
}

const globalSubscribers = new Map<string, any>();

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

let automationSettings = {
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

export default async function handler(req: Request, res: Response) {
  const url = req.url || '';

  if (req.method === 'GET' && (url.endsWith('/health') || url.includes('health'))) {
    return res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  }

  if (req.method === 'GET' && (url.endsWith('/vapid-public-key') || url.includes('vapid-public-key'))) {
    return res.status(200).json({ publicKey: VAPID_PUBLIC_KEY });
  }

  if (req.method === 'POST' && (url.endsWith('/register-subscription') || url.includes('register-subscription'))) {
    const sub = req.body;
    if (sub && sub.endpoint) {
      const deviceType = normalizeDeviceType(sub);
      globalSubscribers.set(sub.endpoint, {
        ...sub,
        deviceType,
        updatedAt: new Date().toISOString()
      });
      return res.status(200).json({ success: true, count: globalSubscribers.size, deviceType });
    }
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  if (req.method === 'GET' && (url.endsWith('/subscribers') || url.includes('subscribers'))) {
    const subs = Array.from(globalSubscribers.values()).map(s => ({
      ...s,
      deviceType: normalizeDeviceType(s)
    }));
    const ios = subs.filter(s => s.deviceType === 'ios').length;
    const android = subs.filter(s => s.deviceType === 'android').length;
    return res.status(200).json({
      success: true,
      count: subs.length,
      deviceStats: { ios, android, desktop: subs.length - ios - android, total: subs.length },
      subscribers: subs
    });
  }

  if (req.method === 'GET' && url.includes('automation-status')) {
    const subs = Array.from(globalSubscribers.values()).map(s => ({
      ...s,
      deviceType: normalizeDeviceType(s)
    }));
    const ios = subs.filter(s => s.deviceType === 'ios').length;
    const android = subs.filter(s => s.deviceType === 'android').length;
    return res.status(200).json({
      success: true,
      settings: automationSettings,
      subscribersCount: subs.length,
      deviceBreakdown: { ios, android, desktop: subs.length - ios - android, total: subs.length }
    });
  }

  if (req.method === 'POST' && url.includes('automation-settings')) {
    automationSettings = { ...automationSettings, ...(req.body || {}) };
    return res.status(200).json({ success: true, settings: automationSettings });
  }

  if (req.method === 'POST' && (url.endsWith('/test-push') || url.includes('test-push'))) {
    const { subscription, title, body, url: targetUrl, tag } = req.body || {};

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing push subscription object' });
    }

    const payload = JSON.stringify({
      title: title || 'CuMeals Mess Alert 🔔',
      body: body || 'Test push notification delivered directly to your device!',
      icon: '/icon-192.png',
      badge: '/favicon.png',
      url: targetUrl || '/',
      tag: tag || 'cumeals-test'
    });

    const pushOptions = {
      TTL: 86400,
      urgency: 'high' as const,
      topic: tag || 'cumeals-test'
    };

    try {
      const result = await webpush.sendNotification(subscription, payload, pushOptions);
      return res.status(200).json({ success: true, statusCode: result.statusCode });
    } catch (error: any) {
      return res.status(error?.statusCode || 500).json({
        success: false,
        error: error?.message || 'Failed to send push notification',
        statusCode: error?.statusCode
      });
    }
  }

  if (req.method === 'POST' && (url.endsWith('/send-push') || url.includes('send-push'))) {
    const { subscriptions, title, body, url: targetUrl, tag } = req.body || {};

    if (!subscriptions || !Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(400).json({ error: 'Subscriptions array is required' });
    }

    const payload = JSON.stringify({
      title: title || 'CuMeals Notice Board',
      body: body || 'New announcement posted for hostel mess.',
      icon: '/icon-192.png',
      badge: '/favicon.png',
      url: targetUrl || '/',
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

    return res.status(200).json({
      success: true,
      total: subscriptions.length,
      sent: sentCount,
      failed: failCount,
      expiredEndpoints
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
