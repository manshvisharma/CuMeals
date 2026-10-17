/**
 * Minimal Firestore REST client (no SDK, no service account).
 *
 * It only touches data the existing security rules already make public:
 *   - menus / timings / settings / notices : public READ
 *   - push_subscriptions                   : public read + write
 * That keeps deployment simple (no extra secrets) and works on Vercel serverless,
 * where the old in-memory approach lost its data between requests.
 */

const PROJECT_ID = () => process.env.FIREBASE_PROJECT_ID || 'cumeal-b93ed';
const API_KEY = () => process.env.FIREBASE_API_KEY || 'AIzaSyCaIXR2toO32XMveAbhYB2bX3Sf34dwCmI';
// Overridable so tests can point at a local fake Firestore.
const BASE = () => process.env.FIRESTORE_REST_BASE || 'https://firestore.googleapis.com/v1';

function docsRoot(): string {
  return `${BASE()}/projects/${PROJECT_ID()}/databases/(default)/documents`;
}

function withKey(url: string): string {
  return url + (url.includes('?') ? '&' : '?') + `key=${encodeURIComponent(API_KEY())}`;
}

// ---------- value conversion ----------
export function fromValue(v: any): any {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return null;
}

export function fromFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromValue(v);
  return out;
}

export function toValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

export function toFields(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) if (v !== undefined) out[k] = toValue(v);
  return out;
}

export interface FsDoc {
  id: string;
  data: Record<string, any>;
}

function docId(name: string): string {
  return decodeURIComponent(name.split('/').pop() || '');
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------- operations ----------
export async function getDocument(path: string): Promise<FsDoc | null> {
  const res = await fetch(withKey(`${docsRoot()}/${path}`));
  if (res.status === 404) return null;
  const json = await readJson(res);
  if (!res.ok) throw new Error(`Firestore GET ${path} failed: ${res.status} ${json?.error?.message || ''}`);
  return { id: docId(json.name), data: fromFields(json.fields || {}) };
}

export async function listDocuments(collection: string, max = 5000): Promise<FsDoc[]> {
  const out: FsDoc[] = [];
  let pageToken = '';
  do {
    const url = withKey(`${docsRoot()}/${collection}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
    const res = await fetch(url);
    const json = await readJson(res);
    if (!res.ok) throw new Error(`Firestore LIST ${collection} failed: ${res.status} ${json?.error?.message || ''}`);
    for (const d of json?.documents || []) out.push({ id: docId(d.name), data: fromFields(d.fields || {}) });
    pageToken = json?.nextPageToken || '';
  } while (pageToken && out.length < max);
  return out;
}

/** Create a document only if it does not exist yet. Returns false when it already existed (atomic "claim"). */
export async function createIfAbsent(collection: string, id: string, data: Record<string, any>): Promise<boolean> {
  const res = await fetch(withKey(`${docsRoot()}/${collection}?documentId=${encodeURIComponent(id)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) })
  });
  if (res.ok) return true;
  const json = await readJson(res);
  if (res.status === 409 || json?.error?.status === 'ALREADY_EXISTS') return false;
  throw new Error(`Firestore CREATE ${collection}/${id} failed: ${res.status} ${json?.error?.message || ''}`);
}

/** Create or fully replace a document. */
export async function setDocument(path: string, data: Record<string, any>): Promise<void> {
  const res = await fetch(withKey(`${docsRoot()}/${path}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) })
  });
  if (!res.ok) {
    const json = await readJson(res);
    throw new Error(`Firestore SET ${path} failed: ${res.status} ${json?.error?.message || ''}`);
  }
}

/** Update only the listed top-level fields (others untouched). */
export async function updateFields(path: string, data: Record<string, any>): Promise<void> {
  const mask = Object.keys(data)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join('&');
  const res = await fetch(withKey(`${docsRoot()}/${path}?${mask}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) })
  });
  if (!res.ok) {
    const json = await readJson(res);
    throw new Error(`Firestore UPDATE ${path} failed: ${res.status} ${json?.error?.message || ''}`);
  }
}

export async function deleteDocument(path: string): Promise<void> {
  const res = await fetch(withKey(`${docsRoot()}/${path}`), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new Error(`Firestore DELETE ${path} failed: ${res.status}`);
}
