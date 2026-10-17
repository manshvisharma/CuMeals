# CuMeals – hostel mess menu app

React 19 + Vite + Tailwind v4 + Firebase, installable PWA, Web-Push meal alerts.

## Run locally
```
npm install
npm run dev        # http://localhost:3000  (app + /api in one server)
```
Production: `npm run build && npm start`.

## Deploy (Vercel)
Push to GitHub → import the repo in Vercel. `/api/*` is served by `api/index.ts`.
Then follow **docs/NOTIFICATIONS_SETUP.md** (GitHub Actions schedule + your own push keys).

## Docs
* `docs/MENU_JSON_FORMAT.md` – menu JSON with food icons + ready-made AI prompt
* `docs/NOTIFICATIONS_SETUP.md` – automatic meal alerts, on/off controls, iOS/Android notes

## Notes
* Navigation is only through the glass tab bar (no swiping between pages).
* Haptics: Android uses the Vibration API, iPhone Safari 17.4+ uses the native switch haptic. Can be switched off in More.
* Admin portal: `/admin` (or More → Admin portal).
