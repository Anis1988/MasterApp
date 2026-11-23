import { askFor, hasKv, resolve } from '../server/flags.js';
import { json } from '../server/guard.js';

// Public and read-only on purpose: your apps ask it from their servers, with no secret to manage. It only says
// "stop AI / stop jobs: yes or no". Changing the switch needs the access code (api/pause.ts).
// Vercel's edge keeps each answer ~10 s (then up to 20 s while refreshing), so a flip reaches apps within ~30 s.
const HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20',
  'Access-Control-Allow-Origin': '*',
};

/** GET ?app=<catalog id> → { app, ai, work, paused, reason?, updatedAt? } */
export async function GET(req: Request): Promise<Response> {
  const app = (new URL(req.url).searchParams.get('app') ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (!hasKv()) return json({ app, ai: false, work: false, paused: false, configured: false }, 200, HEADERS);
  try {
    const f = await askFor(app);
    const s = resolve(f, app);
    return json({ app, ai: s.ai, work: s.work, paused: s.ai || s.work, reason: s.reason, updatedAt: f.updatedAt, configured: true }, 200, HEADERS);
  } catch {
    // Apps carry on when Master can't answer (fail-open), so say "run" and don't cache the hiccup.
    return json({ app, ai: false, work: false, paused: false, configured: true, error: 'unavailable' }, 200, { 'Access-Control-Allow-Origin': '*' });
  }
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' } });
}
