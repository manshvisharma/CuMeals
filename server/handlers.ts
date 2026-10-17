/**
 * Framework-neutral API. Used by both server.ts (Express / any Node host) and api/index.ts (Vercel).
 */
import * as fs from './firestoreRest.js';
import {
  Sender, SettingsPatch, loadSettings, saveSettings, loadTimings, loadSubscribersAndLog, runAlerts,
  sendManualMealAlert, sendToSubscribers, getIST, normalizeDeviceType, toSubscriber, SETTINGS_DOC, SENT_PREFIX
} from './alerts.js';
import { VAPID_PUBLIC_KEY, usingFallbackKeys, webPushSender } from './push.js';

export interface ApiRequest {
  method: string;
  path: string; // without the "/api" prefix, e.g. "/cron"
  query: Record<string, string | undefined>;
  body: any;
  headers: Record<string, string | undefined>;
}
export interface ApiResponse {
  status: number;
  json: any;
}

const ok = (json: any, status = 200): ApiResponse => ({ status, json });
const fail = (status: number, error: string): ApiResponse => ({ status, json: { success: false, error } });

function deviceStats(subs: { deviceType: string }[]) {
  const ios = subs.filter((s) => s.deviceType === 'ios').length;
  const android = subs.filter((s) => s.deviceType === 'android').length;
  return { ios, android, desktop: subs.length - ios - android, total: subs.length };
}

function cronAuthorised(req: ApiRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // not configured: open (the job is idempotent and only sends scheduled alerts)
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${secret}` || req.query.secret === secret;
}

export async function handleApi(req: ApiRequest, sender: Sender = webPushSender): Promise<ApiResponse> {
  const route = `${req.method.toUpperCase()} ${req.path.replace(/\/+$/, '') || '/'}`;
  try {
    switch (route) {
      case 'GET /health':
        return ok({ status: 'ok', serverTimeIST: getIST().formatted, time: new Date().toISOString(), usingFallbackVapidKeys: usingFallbackKeys() });

      case 'GET /vapid-public-key':
        return ok({ publicKey: VAPID_PUBLIC_KEY });

      // Called by the app after a student turns alerts on (also writes straight to Firestore from the app).
      case 'POST /register-subscription': {
        const sub = req.body;
        if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return fail(400, 'Invalid subscription data');
        const id = String(sub.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || `sub_${Date.now()}`;
        const deviceType = normalizeDeviceType(sub);
        await fs.updateFields(`push_subscriptions/${id}`, {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          deviceType,
          isStandalone: Boolean(sub.isStandalone),
          userId: sub.userId || 'anonymous',
          userEmail: sub.userEmail || 'Anonymous Student',
          userName: sub.userName || 'Student',
          ...(sub.alertPrefs ? { alertPrefs: sub.alertPrefs } : {}),
          updatedAt: new Date().toISOString()
        });
        return ok({ success: true, deviceType });
      }

      case 'GET /subscribers': {
        const { subscribers } = await loadSubscribersAndLog();
        return ok({ success: true, count: subscribers.length, deviceStats: deviceStats(subscribers), subscribers });
      }

      case 'GET /automation-status': {
        const [settings, timings, { subscribers, log }] = await Promise.all([loadSettings(), loadTimings(), loadSubscribersAndLog()]);
        const ist = getIST();
        return ok({
          success: true,
          settings,
          timings,
          serverTimeIST: ist.formatted,
          currentMinutesIST: ist.currentMins,
          subscribersCount: subscribers.length,
          deviceBreakdown: deviceStats(subscribers),
          recentAlerts: log.slice(0, 15),
          usingFallbackVapidKeys: usingFallbackKeys(),
          cronSecretRequired: Boolean(process.env.CRON_SECRET)
        });
      }

      case 'POST /automation-settings': {
        if (!req.body || typeof req.body !== 'object') return fail(400, 'Invalid settings object');
        const patch = req.body as SettingsPatch;
        const settings = await saveSettings(patch);
        return ok({ success: true, settings });
      }

      // Kept for backwards compatibility: the server now reads menus/timings from Firestore itself.
      case 'POST /sync-menu-timings':
        return ok({ success: true, note: 'Menus and timings are read directly from Firestore now.' });

      case 'POST /trigger-meal-alert': {
        const result = await sendManualMealAlert(req.body || {}, sender);
        return ok({ success: true, ...result });
      }

      case 'GET /cron':
      case 'POST /cron': {
        if (!cronAuthorised(req)) return fail(401, 'Unauthorized');
        const result = await runAlerts({ sender });
        return ok({ success: result.ok, ...result }, result.ok ? 200 : 500);
      }

      case 'POST /test-push': {
        const { subscription, title, body, url, tag } = req.body || {};
        if (!subscription?.endpoint) return fail(400, 'Missing push subscription object');
        const r = await sendToSubscribers(
          [{ endpoint: subscription.endpoint, keys: subscription.keys }],
          { title: title || 'CuMeals Mess Alert 🔔', body: body || 'Test notification delivered to your device!', tag: tag || 'cumeals-test', url },
          { ttl: 3600, topic: 'cumeals-test' },
          sender
        );
        return r.sent ? ok({ success: true }) : fail(502, 'Push service rejected the message');
      }

      case 'POST /send-push': {
        const { subscriptions, title, body, url, tag } = req.body || {};
        if (!Array.isArray(subscriptions) || subscriptions.length === 0) return fail(400, 'Subscriptions array is required and must not be empty');
        const valid = subscriptions.filter((s: any) => s?.endpoint && s?.keys?.p256dh && s?.keys?.auth);
        const r = await sendToSubscribers(
          valid.map((s: any) => ({ id: s.id, endpoint: s.endpoint, keys: s.keys })),
          { title: title || 'CuMeals Notice Board', body: body || 'New announcement posted for hostel mess.', tag: tag || `cumeals-notice-${Date.now()}`, url },
          { ttl: 86400, topic: 'cumeals-broadcast' },
          sender
        );
        const byId = new Map<string, string>(valid.map((x: any) => [x.id, x.endpoint] as [string, string]));
        return ok({ success: true, total: subscriptions.length, sent: r.sent, failed: r.failed, expiredEndpoints: r.expired.map((id) => byId.get(id)).filter(Boolean) });
      }

      default:
        return fail(404, `Unknown API route: ${route}`);
    }
  } catch (e: any) {
    console.error('[CuMeals API]', route, e?.message || e);
    return fail(500, e?.message || 'Server error');
  }
}

export { SETTINGS_DOC, SENT_PREFIX, toSubscriber };
