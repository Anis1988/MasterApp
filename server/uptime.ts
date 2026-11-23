// Is the site up? One GET (redirects followed), 8 s at most.

import type { SiteCheck } from './types.js';

export async function checkSite(url: string): Promise<SiteCheck> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'MasterApp uptime check' },
      signal: AbortSignal.timeout(8_000),
    });
    await res.body?.cancel().catch(() => undefined);
    const ms = Date.now() - t0;
    const s = res.status;
    if (s < 400) return { url, ok: true, status: s, ms, label: ms > 3000 ? 'Up, slow' : 'Up', tone: ms > 3000 ? 'warn' : 'good' };
    if (s === 401 || s === 403) return { url, ok: true, status: s, ms, label: 'Up (locked)', tone: 'good' };
    if (s === 503 && res.headers.get('x-vercel-error') === 'DEPLOYMENT_PAUSED')
      return { url, ok: false, status: s, ms, label: 'Paused', tone: 'muted' };
    return { url, ok: false, status: s, ms, label: `Down (HTTP ${s})`, tone: 'bad' };
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { url, ok: false, status: 0, ms: Date.now() - t0, label: timedOut ? 'No answer in 8 s' : 'Unreachable', tone: 'bad' };
  }
}
