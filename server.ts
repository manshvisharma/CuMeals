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
// API ROUTES FIRST
// ----------------------------------------------------

// In-memory subscribers registry (serves as immediate sync bridge)
const serverSubscribers = new Map<string, any>();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get Public VAPID Key for client subscriptions
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Register / update a subscription directly on server
app.post('/api/register-subscription', (req, res) => {
  const sub = req.body;
  if (sub && sub.endpoint) {
    serverSubscribers.set(sub.endpoint, sub);
    return res.json({ success: true, count: serverSubscribers.size });
  }
  return res.status(400).json({ error: 'Invalid subscription data' });
});

// Get all subscribers from server registry
app.get('/api/subscribers', (req, res) => {
  res.json({
    success: true,
    count: serverSubscribers.size,
    subscribers: Array.from(serverSubscribers.values())
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

  try {
    const result = await webpush.sendNotification(subscription, payload);
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

  let sentCount = 0;
  let failCount = 0;
  const expiredEndpoints: string[] = [];

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        const targetSub = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };
        await webpush.sendNotification(targetSub, payload);
        sentCount++;
      } catch (err: any) {
        failCount++;
        // HTTP 404 or 410 indicates expired/unregistered subscription token
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

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
