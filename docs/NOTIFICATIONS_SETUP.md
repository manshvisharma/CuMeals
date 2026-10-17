# Notifications – how they work & one-time setup

## What students get
* **Menu reminder** before each meal (default 1 hour before; the admin can change it): "🍛 Lunch in 1 hour – 🍲 Chana Dal, 🍚 Rice … · 12:30 PM – 2:00 PM"
* **"Meal is being served"** when the meal starts
* **"Ends in 30 min"** reminder
* Admin broadcasts (**Admin → Push**) reach every subscribed phone instantly.
* Each student chooses on their own phone (More → Meal alerts) which meals alert them and which snacks block (Boys/Girls).
* Admin → Push → **Automation Enabled** switch, the three trigger switches and per-meal switches turn things on/off for everybody.

## How automatic alerts are triggered
A website on Vercel has no program running all day, so something has to "knock" on `/api/cron` every few minutes.
The server then checks the time (IST), timings and today's menu in Firestore, and sends whatever is due – **each alert exactly once**.

### Option A – GitHub Actions (free, recommended for Vercel)
The workflow `.github/workflows/meal-alerts.yml` is already in the project.
1. GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
   `SITE_URL` = `https://your-site.vercel.app` (no trailing slash)
2. (Optional but recommended) Vercel → Project → Settings → Environment Variables: `CRON_SECRET` = a long random text.
   GitHub → same page → **Secrets** → `CRON_SECRET` = the same text.
3. GitHub → **Actions → Meal alerts → Run workflow** once to test. It must finish green.

Notes: GitHub may start a scheduled run a few minutes late – alerts are still sent if the delay is under 25 minutes.
GitHub switches schedules off after 60 days without any commit in the repo; open Actions and re-enable if that ever happens.

### Option B – any Node host (VPS, Render, Railway, your PC)
`npm run build && npm start` – the server runs its own every-minute timer, nothing else to set up.
(Set `DISABLE_SCHEDULER=true` if you also use Option A. Running both is safe.)

### Option C – an external pinger
cron-job.org or UptimeRobot can call `https://your-site.vercel.app/api/cron` every 5 minutes (add header `Authorization: Bearer <CRON_SECRET>` if you set one).

## Push keys (important)
The project originally contained a push key pair inside the code. Replace it with your own:
1. `npx web-push generate-vapid-keys`
2. Vercel → Environment Variables: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:you@yourmail.com`
3. Put the **public** key in `src/utils/pushNotifications.ts` (`VAPID_PUBLIC_KEY`) and redeploy.
4. Students must turn alerts off/on once (old subscriptions belong to the old key).
Until you do this the app keeps working with the old keys, and Admin → Push shows a security notice.

## Phones
* **Android (Chrome/Edge)**: works in the browser and when installed.
* **iPhone / iPad (iOS 16.4+)**: the app must be added to the Home Screen first (Share → Add to Home Screen), then open it from there and turn alerts on.

## Troubleshooting
* Open `https://your-site/api/health` – should say `"status":"ok"`.
* Open `https://your-site/api/cron` – answers with JSON like `{"due":0,...}`; `due` > 0 right at a trigger time.
* Admin → Push → "Recent automatic notifications" lists everything that was sent.
* No alerts at all: check the workflow ran (green) and that **Automation Enabled** is on.
