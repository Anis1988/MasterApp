// The kill switch every app asks before AI calls ("ai") and background work: cron, scheduled jobs, emails ("work").
// Stored in Upstash as one small JSON document. Apps read it through GET /api/flags?app=<id> and, by asking,
// tell Master they're connected (a "last seen" time per app).

import { CATALOG } from './catalog.js';
import { hasKv, kv } from './kv.js';

export interface Switch {
  ai: boolean;
  work: boolean;
  reason?: string;
  at?: string;
}

export interface Flags {
  v: 1;
  /** AI off everywhere: every connected app stops calling AI, sites stay up. */
  all: { ai: boolean; at?: string };
  /** Per app (catalog id): set by Pause / Pause everything, cleared by Resume. */
  apps: Record<string, Switch>;
  updatedAt?: string;
}

const KEY = 'master:flags';
const SEEN = (id: string) => `master:seen:${id}`;
const KNOWN = new Set(CATALOG.map((a) => a.id));

export { hasKv };
export const empty = (): Flags => ({ v: 1, all: { ai: false }, apps: {} });

function parse(raw: unknown): Flags {
  if (typeof raw !== 'string' || !raw) return empty();
  try {
    const f = JSON.parse(raw) as Partial<Flags>;
    return { v: 1, all: { ai: !!f.all?.ai, at: f.all?.at }, apps: f.apps && typeof f.apps === 'object' ? f.apps : {}, updatedAt: f.updatedAt };
  } catch {
    return empty();
  }
}

export async function readFlags(): Promise<Flags> {
  const [raw] = await kv([['GET', KEY]]);
  return parse(raw);
}

/** Read, change, save. One person uses Master, so a plain read-then-write is enough. */
export async function updateFlags(change: (f: Flags) => void): Promise<Flags> {
  const f = await readFlags();
  change(f);
  f.updatedAt = new Date().toISOString();
  await kv([['SET', KEY, JSON.stringify(f)]]);
  return f;
}

/** What one app should do right now. */
export function resolve(f: Flags, id: string): { ai: boolean; work: boolean; reason?: string } {
  const own = f.apps[id];
  const work = !!own?.work;
  const ai = !!f.all.ai || !!own?.ai;
  const reason = own?.reason ?? (f.all.ai ? 'AI is off everywhere (Master)' : undefined);
  return { ai, work, reason: ai || work ? reason : undefined };
}

/** For GET /api/flags: the switch for one app, and "seen now" for that app (known apps only). */
export async function askFor(id: string): Promise<Flags> {
  const cmds: (string | number)[][] = [['GET', KEY]];
  if (KNOWN.has(id)) cmds.push(['SET', SEEN(id), new Date().toISOString(), 'EX', 60 * 60 * 24 * 30]);
  const [raw] = await kv(cmds);
  return parse(raw);
}

/** When each app last asked (ISO time, or null). */
export async function lastSeen(ids: string[]): Promise<Record<string, string | null>> {
  if (!ids.length) return {};
  const [vals] = await kv([['MGET', ...ids.map(SEEN)]]);
  const arr = Array.isArray(vals) ? vals : [];
  return Object.fromEntries(ids.map((id, i) => [id, typeof arr[i] === 'string' ? (arr[i] as string) : null]));
}
