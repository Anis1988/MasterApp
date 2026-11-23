// Claude API spend for the whole organization (every app's key together), from Anthropic's cost report.
// Needs ANTHROPIC_ADMIN_KEY (sk-ant-admin…, Claude Console → Settings → Admin keys). Admin keys exist only for
// organizations, not individual accounts. Amounts come in cents, as decimal strings.

import { getJson } from './http.js';
import type { Spend } from './types.js';

const API = 'https://api.anthropic.com/v1/organizations/cost_report';
const DAY = 86_400_000;

interface Bucket {
  starting_at: string;
  results: { amount: string; description?: string | null }[];
}

const dayStart = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

/** "Claude Sonnet 4 Usage - Input Tokens" → "Claude Sonnet 4". */
const modelOf = (description?: string | null) =>
  (description ?? 'Other').split(' - ')[0].replace(/\s+Usage$/i, '').trim() || 'Other';

export async function getSpend(): Promise<Spend> {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) return { configured: false };
  const now = Date.now();
  const today = dayStart(now);
  const monthStart = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
  const start = Math.min(monthStart, today - 13 * DAY);
  const buckets: Bucket[] = [];
  let page: string | undefined;
  try {
    for (let i = 0; i < 3; i++) {
      const q = new URLSearchParams({
        starting_at: new Date(start).toISOString(),
        ending_at: new Date(today + DAY).toISOString(),
        bucket_width: '1d',
        limit: '31',
      });
      q.append('group_by[]', 'description');
      if (page) q.set('page', page);
      const j = await getJson<{ data?: Bucket[]; has_more?: boolean; next_page?: string | null }>('Anthropic', `${API}?${q}`, {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      });
      buckets.push(...(j.data ?? []));
      if (!j.has_more || !j.next_page) break;
      page = j.next_page;
    }
  } catch (e) {
    return { configured: true, error: e instanceof Error ? e.message : String(e) };
  }

  const byDay = new Map<number, number>();
  const byModel = new Map<string, number>();
  for (const b of buckets) {
    const t = dayStart(Date.parse(b.starting_at));
    for (const r of b.results ?? []) {
      const usd = (parseFloat(r.amount) || 0) / 100;
      byDay.set(t, (byDay.get(t) ?? 0) + usd);
      if (t >= monthStart) byModel.set(modelOf(r.description), (byModel.get(modelOf(r.description)) ?? 0) + usd);
    }
  }
  let monthUsd = 0;
  for (const [t, usd] of byDay) if (t >= monthStart) monthUsd += usd;
  const days: { date: string; usd: number }[] = [];
  for (let t = today - 13 * DAY; t <= today; t += DAY) days.push({ date: new Date(t).toISOString().slice(0, 10), usd: byDay.get(t) ?? 0 });
  const top = [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, usd]) => ({ name, usd }));
  return { configured: true, monthUsd, todayUsd: byDay.get(today) ?? 0, days, top };
}
