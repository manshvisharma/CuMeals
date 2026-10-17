/**
 * Automatic meal alerts – stateless, so it works on Vercel serverless AND on a normal Node server.
 *
 * Everything the job needs lives in Firestore:
 *   settings  -> push_subscriptions/__settings      (admin's on/off + options)
 *   timings   -> timings/default                    (same data the app shows)
 *   menus     -> menus/<YYYY-MM-DD>                 (items + icons)
 *   devices   -> push_subscriptions/<id>            (endpoint, keys, per-device alertPrefs)
 *   "already sent" markers -> push_subscriptions/__sent_<date>_<slot>_<type>
 *
 * Calling runAlerts() every few minutes (GitHub Actions / cron-job.org / setInterval) sends each
 * alert exactly once, even if two runs overlap (the marker is created atomically).
 */
import { formatItemsWithIcons } from '../src/utils/foodIcons.js';
import * as fs from './firestoreRest.js';

export type MealId = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export type SlotId = 'breakfast' | 'lunch' | 'snacksBoys' | 'snacksGirls' | 'dinner';
export type AlertKind = 'before' | 'start' | 'ending' | 'info';

export interface AutomationSettings {
  enabled: boolean;
  notify1HourBefore: boolean;
  notifyOnStart: boolean;
  notify30MinBeforeEnd: boolean;
  /** minutes before a meal for the "menu" reminder (default 60) */
  leadMinutes: number;
  meals: Record<MealId, boolean>;
}

export const DEFAULT_SETTINGS: AutomationSettings = {
  enabled: true,
  notify1HourBefore: true,
  notifyOnStart: true,
  notify30MinBeforeEnd: true,
  leadMinutes: 60,
  meals: { breakfast: true, lunch: true, snacks: true, dinner: true }
};

export const DEFAULT_TIMINGS: Record<string, string> = {
  breakfast: '8:00 AM – 9:30 AM',
  lunch: '12:30 PM – 2:00 PM',
  snacksBoys: '4:30 PM – 5:30 PM (Boys Block)',
  snacksGirls: '4:30 PM – 5:30 PM (Girls Block)',
  dinner: '8:00 PM – 9:30 PM'
};

export interface Subscriber {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceType: 'ios' | 'android' | 'desktop';
  userName?: string;
  userEmail?: string;
  isStandalone?: boolean;
  updatedAt?: string;
  prefs: { breakfast: boolean; lunch: boolean; snacks: boolean; dinner: boolean; snacksBlock: 'boys' | 'girls' };
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}
export interface SendOptions {
  ttl: number;
  topic: string;
}
export type Sender = (target: PushTarget, payload: PushPayload, opts: SendOptions) => Promise<{ ok: boolean; statusCode?: number }>;

export const SETTINGS_DOC = '__settings';
export const SENT_PREFIX = '__sent_';
const COLLECTION = 'push_subscriptions';
const LATE_TOLERANCE_MIN = 25; // still send if the scheduler ran up to 25 min late

// ---------------------------------------------------------------- time helpers
export function getIST(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(now);
  const o: Record<string, string> = {};
  parts.forEach((p) => (o[p.type] = p.value));
  const hours = parseInt(o.hour, 10) % 24; // "24" can appear at midnight
  const minutes = parseInt(o.minute, 10);
  const dateStr = `${o.year}-${o.month}-${o.day}`;
  return {
    dateStr,
    currentMins: hours * 60 + minutes,
    formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST (${dateStr})`
  };
}

export function parseClock(s: string): number | null {
  const m = String(s || '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const pm = m[3].toUpperCase() === 'PM';
  if (pm && h < 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h * 60 + min;
}

export function parseRange(range: string): { start: number; end: number; startLabel: string; endLabel: string } | null {
  const matches = String(range || '').match(/\d{1,2}:\d{2}\s*(?:AM|PM)/gi);
  if (!matches || matches.length < 2) return null;
  const start = parseClock(matches[0]);
  let end = parseClock(matches[1]);
  if (start === null || end === null) return null;
  if (end <= start) end += 24 * 60;
  return { start, end, startLabel: matches[0].toUpperCase().replace(/\s+/g, ' '), endLabel: matches[1].toUpperCase().replace(/\s+/g, ' ') };
}

// ---------------------------------------------------------------- slots & messages
export interface MealSlot {
  slot: SlotId;
  meal: MealId;
  block?: 'boys' | 'girls';
  name: string;
  emoji: string;
  start: number;
  end: number;
  startLabel: string;
  endLabel: string;
  range: string;
}

const SLOT_DEFS: { slot: SlotId; meal: MealId; block?: 'boys' | 'girls'; name: string; emoji: string }[] = [
  { slot: 'breakfast', meal: 'breakfast', name: 'Breakfast', emoji: '🥞' },
  { slot: 'lunch', meal: 'lunch', name: 'Lunch', emoji: '🍛' },
  { slot: 'snacksBoys', meal: 'snacks', block: 'boys', name: 'Snacks', emoji: '☕' },
  { slot: 'snacksGirls', meal: 'snacks', block: 'girls', name: 'Snacks', emoji: '☕' },
  { slot: 'dinner', meal: 'dinner', name: 'Dinner', emoji: '🍽️' }
];

export function buildSlots(timings: Record<string, any>): MealSlot[] {
  const out: MealSlot[] = [];
  for (const d of SLOT_DEFS) {
    const raw = String(timings?.[d.slot] || DEFAULT_TIMINGS[d.slot] || '');
    const r = parseRange(raw);
    if (!r) continue;
    out.push({ ...d, ...r, range: `${r.startLabel} – ${r.endLabel}` });
  }
  return out;
}

export interface DueAlert {
  key: string; // unique per day / slot / type
  slot: MealSlot;
  kind: AlertKind;
  label: string; // human label for admin history
}

function leadOf(settings: AutomationSettings): number {
  const n = Number(settings.leadMinutes);
  return Number.isFinite(n) ? Math.min(180, Math.max(5, Math.round(n))) : 60;
}

export function findDueAlerts(settings: AutomationSettings, slots: MealSlot[], now: Date = new Date()): DueAlert[] {
  const { dateStr, currentMins: n } = getIST(now);
  const lead = leadOf(settings);
  const due: DueAlert[] = [];
  for (const s of slots) {
    if (!settings.meals[s.meal]) continue;
    if (settings.notify1HourBefore) {
      const t = s.start - lead;
      if (n >= t && n < Math.min(t + LATE_TOLERANCE_MIN, s.start)) due.push({ key: `${dateStr}_${s.slot}_before`, slot: s, kind: 'before', label: `${lead === 60 ? '1 Hour' : lead + ' Min'} Before` });
    }
    if (settings.notifyOnStart) {
      if (n >= s.start && n < Math.min(s.start + LATE_TOLERANCE_MIN, s.end)) due.push({ key: `${dateStr}_${s.slot}_start`, slot: s, kind: 'start', label: 'Meal Started' });
    }
    if (settings.notify30MinBeforeEnd && s.end - 30 > s.start) {
      const t = s.end - 30;
      if (n >= t && n < s.end) due.push({ key: `${dateStr}_${s.slot}_ending`, slot: s, kind: 'ending', label: '30 Min Before End' });
    }
  }
  return due;
}

export interface MenuLike {
  items?: string[];
  icons?: { name: string; icon: string }[];
}

export function buildMessage(kind: AlertKind, slot: MealSlot, meal: MenuLike | null, settings: AutomationSettings, key: string): PushPayload {
  const items = formatItemsWithIcons(meal?.items || [], meal?.icons || [], 5);
  const lead = leadOf(settings);
  const leadText = lead === 60 ? '1 hour' : lead % 60 === 0 ? `${lead / 60} hours` : `${lead} min`;
  const tag = `cumeals-${key}`;
  if (kind === 'before') {
    return {
      title: `${slot.emoji} ${slot.name} in ${leadText}`,
      body: items ? `${items} · ${slot.range}` : `Starts ${slot.startLabel}. The menu isn't posted yet — check the app.`,
      tag
    };
  }
  if (kind === 'start') {
    return {
      title: `${slot.emoji} ${slot.name} is being served`,
      body: items ? `Today: ${items}` : `Open until ${slot.endLabel}.`,
      tag
    };
  }
  if (kind === 'ending') {
    return {
      title: `⏰ ${slot.name} ends in 30 min`,
      body: `Closes at ${slot.endLabel}. ${items ? `On the menu: ${items}` : 'Go grab your meal!'}`.trim(),
      tag
    };
  }
  return {
    title: `${slot.emoji} ${slot.name} menu`,
    body: items ? `${items} · ${slot.range}` : `Timing: ${slot.range}`,
    tag
  };
}

const TTL: Record<AlertKind, number> = { before: 30 * 60, start: 20 * 60, ending: 15 * 60, info: 6 * 60 * 60 };

// ---------------------------------------------------------------- data loading
export function normalizeDeviceType(sub: any): 'ios' | 'android' | 'desktop' {
  const endpoint = String(sub?.endpoint || '').toLowerCase();
  const raw = String(sub?.deviceType || '').toLowerCase();
  if (raw === 'ios' || endpoint.includes('push.apple.com')) return 'ios';
  if (raw === 'android' || endpoint.includes('fcm.googleapis.com')) return 'android';
  return 'desktop';
}

export function toSubscriber(id: string, d: Record<string, any>): Subscriber | null {
  if (!d || typeof d.endpoint !== 'string' || !d.keys?.p256dh || !d.keys?.auth) return null;
  const p = d.alertPrefs || {};
  return {
    id,
    endpoint: d.endpoint,
    keys: { p256dh: d.keys.p256dh, auth: d.keys.auth },
    deviceType: normalizeDeviceType(d),
    userName: d.userName,
    userEmail: d.userEmail,
    isStandalone: d.isStandalone,
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : undefined,
    prefs: {
      breakfast: p.breakfast !== false,
      lunch: p.lunch !== false,
      snacks: p.snacks !== false,
      dinner: p.dinner !== false,
      snacksBlock: p.snacksBlock === 'girls' ? 'girls' : 'boys'
    }
  };
}

export function mergeSettings(raw: any): AutomationSettings {
  const r = raw || {};
  return {
    enabled: r.enabled !== false,
    notify1HourBefore: r.notify1HourBefore !== false,
    notifyOnStart: r.notifyOnStart !== false,
    notify30MinBeforeEnd: r.notify30MinBeforeEnd !== false,
    leadMinutes: Number.isFinite(Number(r.leadMinutes)) && r.leadMinutes ? Number(r.leadMinutes) : DEFAULT_SETTINGS.leadMinutes,
    meals: {
      breakfast: r.meals?.breakfast !== false,
      lunch: r.meals?.lunch !== false,
      snacks: r.meals?.snacks !== false,
      dinner: r.meals?.dinner !== false
    }
  };
}

export async function loadSettings(): Promise<AutomationSettings> {
  const d = await fs.getDocument(`${COLLECTION}/${SETTINGS_DOC}`);
  return mergeSettings(d?.data);
}

export type SettingsPatch = Partial<Omit<AutomationSettings, 'meals'>> & { meals?: Partial<Record<MealId, boolean>> };

export async function saveSettings(patch: SettingsPatch): Promise<AutomationSettings> {
  const current = await loadSettings();
  const next = mergeSettings({ ...current, ...patch, meals: { ...current.meals, ...(patch.meals || {}) } });
  next.leadMinutes = leadOf(next);
  await fs.setDocument(`${COLLECTION}/${SETTINGS_DOC}`, { ...next, updatedAt: new Date().toISOString() });
  return next;
}

export async function loadTimings(): Promise<Record<string, any>> {
  try {
    const d = await fs.getDocument('timings/default');
    return { ...DEFAULT_TIMINGS, ...(d?.data || {}) };
  } catch {
    return { ...DEFAULT_TIMINGS };
  }
}

export async function loadMenu(dateStr: string): Promise<Record<string, any> | null> {
  try {
    const d = await fs.getDocument(`menus/${dateStr}`);
    return d?.data || null;
  } catch {
    return null;
  }
}

export interface AlertLogEntry {
  id: string;
  key: string;
  timestamp: string;
  meal: string;
  type: string;
  title: string;
  body: string;
  sentCount: number;
  failedCount: number;
}

export async function loadSubscribersAndLog(): Promise<{ subscribers: Subscriber[]; log: AlertLogEntry[] }> {
  const docs = await fs.listDocuments(COLLECTION);
  const subscribers: Subscriber[] = [];
  const log: AlertLogEntry[] = [];
  for (const d of docs) {
    if (d.id.startsWith(SENT_PREFIX)) {
      log.push({
        id: d.id,
        key: String(d.data.key || d.id),
        timestamp: String(d.data.istTime || d.data.at || ''),
        meal: String(d.data.meal || ''),
        type: String(d.data.type || ''),
        title: String(d.data.title || ''),
        body: String(d.data.body || ''),
        sentCount: Number(d.data.sentCount || 0),
        failedCount: Number(d.data.failedCount || 0)
      });
      (log[log.length - 1] as any)._at = String(d.data.at || '');
    } else if (!d.id.startsWith('__')) {
      const s = toSubscriber(d.id, d.data);
      if (s) subscribers.push(s);
    }
  }
  log.sort((a: any, b: any) => String(b._at).localeCompare(String(a._at)));
  log.forEach((l: any) => delete l._at);
  return { subscribers, log };
}

// ---------------------------------------------------------------- sending
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function sendToSubscribers(
  subs: { id?: string; endpoint: string; keys: { p256dh: string; auth: string } }[],
  payload: PushPayload,
  opts: SendOptions,
  sender: Sender
): Promise<{ sent: number; failed: number; expired: string[] }> {
  let sent = 0;
  let failed = 0;
  const expired: string[] = [];
  await mapLimit(subs, 20, async (s) => {
    try {
      const r = await sender({ endpoint: s.endpoint, keys: s.keys }, payload, opts);
      if (r.ok) sent++;
      else {
        failed++;
        if (r.statusCode === 404 || r.statusCode === 410) if (s.id) expired.push(s.id);
      }
    } catch {
      failed++;
    }
  });
  // Dead subscriptions (uninstalled app / revoked permission) are cleaned up automatically.
  await Promise.allSettled(expired.map((id) => fs.deleteDocument(`${COLLECTION}/${id}`)));
  return { sent, failed, expired };
}

export function eligibleFor(sub: Subscriber, slot: MealSlot): boolean {
  if (!sub.prefs[slot.meal]) return false;
  if (slot.meal === 'snacks' && slot.block && sub.prefs.snacksBlock !== slot.block) return false;
  return true;
}

export interface RunResult {
  ok: boolean;
  skipped?: string;
  istTime: string;
  due: number;
  sent: { key: string; title: string; recipients: number; sent: number; failed: number }[];
  alreadySent: string[];
  errors: string[];
}

export async function runAlerts(opts: { sender: Sender; now?: Date }): Promise<RunResult> {
  const now = opts.now || new Date();
  const ist = getIST(now);
  const result: RunResult = { ok: true, istTime: ist.formatted, due: 0, sent: [], alreadySent: [], errors: [] };

  const settings = await loadSettings();
  if (!settings.enabled) return { ...result, skipped: 'Automatic alerts are switched off in the admin panel' };

  const timings = await loadTimings();
  const due = findDueAlerts(settings, buildSlots(timings), now);
  result.due = due.length;
  if (!due.length) return result;

  const { subscribers } = await loadSubscribersAndLog();
  const menu = await loadMenu(ist.dateStr);

  for (const alert of due) {
    try {
      const menuKey = alert.slot.slot;
      const payload = buildMessage(alert.kind, alert.slot, (menu && menu[menuKey]) || null, settings, alert.key);
      // Claim first: if another run already did, skip (prevents duplicates).
      const claimed = await fs.createIfAbsent(COLLECTION, `${SENT_PREFIX}${alert.key}`, {
        key: alert.key,
        meal: alert.slot.slot === 'snacksBoys' ? 'Snacks (Boys)' : alert.slot.slot === 'snacksGirls' ? 'Snacks (Girls)' : alert.slot.name,
        type: alert.label,
        title: payload.title,
        body: payload.body,
        at: now.toISOString(),
        istTime: ist.formatted,
        sentCount: 0,
        failedCount: 0
      });
      if (!claimed) {
        result.alreadySent.push(alert.key);
        continue;
      }
      const recipients = subscribers.filter((s) => eligibleFor(s, alert.slot));
      const r = await sendToSubscribers(recipients, payload, { ttl: TTL[alert.kind], topic: alert.key.slice(-32).replace(/[^A-Za-z0-9_-]/g, '') }, opts.sender);
      await fs.updateFields(`${COLLECTION}/${SENT_PREFIX}${alert.key}`, { sentCount: r.sent, failedCount: r.failed, recipients: recipients.length });
      result.sent.push({ key: alert.key, title: payload.title, recipients: recipients.length, sent: r.sent, failed: r.failed });
    } catch (e: any) {
      result.ok = false;
      result.errors.push(`${alert.key}: ${e?.message || e}`);
    }
  }

  // housekeeping: drop "already sent" markers older than 3 days
  try {
    const cutoff = new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10);
    const docs = await fs.listDocuments(COLLECTION);
    await Promise.allSettled(
      docs.filter((d) => d.id.startsWith(SENT_PREFIX) && String(d.data.at || '').slice(0, 10) < cutoff).map((d) => fs.deleteDocument(`${COLLECTION}/${d.id}`))
    );
  } catch {
    /* best effort */
  }
  return result;
}

// ---------------------------------------------------------------- manual (admin button)
export async function sendManualMealAlert(
  input: { meal?: string; type?: string; customTitle?: string; customBody?: string },
  sender: Sender,
  now: Date = new Date()
) {
  const ist = getIST(now);
  const mealId = (['breakfast', 'lunch', 'snacks', 'dinner'].includes(String(input.meal)) ? input.meal : 'dinner') as MealId;
  const settings = await loadSettings();
  const timings = await loadTimings();
  const slots = buildSlots(timings).filter((s) => s.meal === mealId);
  const menu = await loadMenu(ist.dateStr);
  const { subscribers } = await loadSubscribersAndLog();
  const kind: AlertKind = input.type === '1hour_before' ? 'before' : input.type === 'start' ? 'start' : input.type === '30min_before_end' ? 'ending' : 'info';

  let sent = 0;
  let failed = 0;
  let title = '';
  let body = '';
  for (const slot of slots) {
    const key = `manual_${Date.now()}_${slot.slot}`;
    const base = buildMessage(kind, slot, (menu && menu[slot.slot]) || null, settings, key);
    const payload = { ...base, title: input.customTitle || base.title, body: input.customBody || base.body };
    title = payload.title;
    body = payload.body;
    // Manual alerts go to everybody on that block (the admin chose to send them).
    const recipients = subscribers.filter((s) => !(slot.meal === 'snacks' && slot.block && s.prefs.snacksBlock !== slot.block));
    const r = await sendToSubscribers(recipients, payload, { ttl: TTL.info, topic: 'manual' }, sender);
    sent += r.sent;
    failed += r.failed;
  }
  const logId = `${SENT_PREFIX}manual_${Date.now()}`;
  try {
    await fs.setDocument(`${COLLECTION}/${logId}`, {
      key: `manual_${mealId}`,
      meal: mealId.charAt(0).toUpperCase() + mealId.slice(1),
      type: 'Manual Alert',
      title,
      body,
      at: now.toISOString(),
      istTime: ist.formatted,
      sentCount: sent,
      failedCount: failed
    });
  } catch {
    /* log is optional */
  }
  return { title, body, sent, failed, total: subscribers.length };
}
