// Upstash Redis over its REST API (no package needed). Vercel → Storage → Upstash Redis → Connect to this project
// adds KV_REST_API_URL and KV_REST_API_TOKEN (older setups: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).

import { HttpError, request } from './http.js';

const url = () => (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const hasKv = () => !!(url() && token());

/** Runs several Redis commands in one request; returns their results in order. */
export async function kv(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await request(
    'Upstash',
    `${url()}/pipeline`,
    { method: 'POST', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) },
    5_000,
  );
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => {
    if (r.error) throw new HttpError(`Upstash: ${r.error}`, 500);
    return r.result;
  });
}
