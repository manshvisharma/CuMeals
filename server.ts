import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { handleApi } from './server/handlers.js';
import { runAlerts } from './server/alerts.js';
import { webPushSender } from './server/push.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

// ----------------------------------------------------
// API (shared with the Vercel function in api/index.ts)
// ----------------------------------------------------
app.all('/api/*', async (req, res) => {
  const result = await handleApi({
    method: req.method,
    path: req.path.replace(/^\/api/, '') || '/',
    query: Object.fromEntries(Object.entries(req.query).map(([k, v]) => [k, Array.isArray(v) ? String(v[0]) : (v as string | undefined)])),
    body: req.body,
    headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
  });
  res.status(result.status).json(result.json);
});

// ----------------------------------------------------
// Built-in scheduler for a normally-hosted Node server (VPS, Render, Railway, your PC...).
// On Vercel there is no always-on process, so use the GitHub Actions workflow instead (see docs/NOTIFICATIONS_SETUP.md).
// Running both is safe: every alert is claimed atomically in Firestore, so it is only ever sent once.
// ----------------------------------------------------
function startScheduler() {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    console.log('[CuMeals Server] Built-in alert scheduler disabled (DISABLE_SCHEDULER=true)');
    return;
  }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const r = await runAlerts({ sender: webPushSender });
      for (const s of r.sent) console.log(`[Alerts] "${s.title}" -> ${s.sent}/${s.recipients} delivered`);
      for (const e of r.errors) console.error('[Alerts] error:', e);
    } catch (e: any) {
      console.error('[Alerts] scheduler error:', e?.message || e);
    } finally {
      running = false;
    }
  };
  setInterval(tick, 60_000);
  setTimeout(tick, 5_000);
  console.log('[CuMeals Server] Meal-alert scheduler running (checks every minute)');
}

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP
// ----------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    startScheduler();
  });
}

start().catch((err) => {
  console.error('[CuMeals Server] Startup failure:', err);
});
