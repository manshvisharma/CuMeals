// Vercel serverless entry. All /api/* requests are rewritten here (see vercel.json).
// The logic lives in ../server so the local Node server and Vercel behave identically.
import type { IncomingMessage, ServerResponse } from 'http';
import { handleApi } from '../server/handlers.js';

export default async function handler(req: IncomingMessage & { body?: any; query?: any }, res: ServerResponse & { status?: any; json?: any }) {
  const url = new URL(req.url || '/', 'http://localhost');
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/index(\.ts)?$/, '') || '/';

  let body = (req as any).body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* keep string */
    }
  }

  const result = await handleApi({
    method: req.method || 'GET',
    path,
    query: Object.fromEntries(url.searchParams.entries()),
    body,
    headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]))
  });

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(result.json));
}
