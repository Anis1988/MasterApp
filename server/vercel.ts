// Vercel: your projects (matched to repos), their production deploy, and the pause switch.
// Pausing makes Vercel answer every visit with 503 (DEPLOYMENT_PAUSED): no traffic, no functions, no cron.
// Needs VERCEL_TOKEN (vercel.com → Account Settings → Tokens). VERCEL_TEAM_ID only if the projects live in a team.

import { cached } from './cache.js';
import { getJson, request } from './http.js';
import type { Deploy, Tone } from './types.js';

const API = 'https://api.vercel.com';
export const hasVercel = () => !!process.env.VERCEL_TOKEN;

const headers = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.VERCEL_TOKEN ?? ''}`,
  'Content-Type': 'application/json',
});
const team = (sep: '?' | '&') =>
  process.env.VERCEL_TEAM_ID ? `${sep}teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : '';

interface VDeploy {
  id?: string;
  url?: string;
  readyState?: string;
  state?: string;
  createdAt?: number;
  created?: number;
  target?: string | null;
  alias?: string[];
  meta?: Record<string, string | undefined>;
}

export interface VProject {
  id: string;
  name: string;
  paused?: boolean;
  link?: { type?: string; org?: string; repo?: string };
  latestDeployments?: VDeploy[];
  targets?: { production?: VDeploy | null } | null;
  alias?: { domain?: string }[];
}

export async function projects(): Promise<VProject[]> {
  const all: VProject[] = [];
  let from: number | undefined;
  for (let page = 0; page < 5; page++) {
    const j = await getJson<{ projects?: VProject[]; pagination?: { next?: number | null } }>(
      'Vercel',
      `${API}/v10/projects?limit=100${from ? `&from=${from}` : ''}${team('&')}`,
      { headers: headers() },
    );
    all.push(...(j.projects ?? []));
    if (!j.pagination?.next) break;
    from = j.pagination.next;
  }
  return all;
}

/** Your Vercel username (or team slug), for links to the dashboard. */
export function scope(): Promise<string> {
  return cached('v:scope', 86_400_000, async () => {
    if (process.env.VERCEL_TEAM_ID) {
      const t = await getJson<{ slug: string }>('Vercel', `${API}/v2/teams/${encodeURIComponent(process.env.VERCEL_TEAM_ID)}`, {
        headers: headers(),
      });
      return t.slug;
    }
    const u = await getJson<{ user: { username: string } }>('Vercel', `${API}/v2/user`, { headers: headers() });
    return u.user.username;
  });
}

export const repoOf = (p: VProject) => (p.link?.type === 'github' && p.link.repo ? p.link.repo.toLowerCase() : undefined);

function productionDeploy(p: VProject): VDeploy | undefined {
  const prod = p.targets?.production;
  if (prod && (prod.readyState || prod.state)) return prod;
  return p.latestDeployments?.find((d) => d.target === 'production') ?? p.latestDeployments?.[0];
}

/** Best public address: a custom domain first, then the shortest *.vercel.app alias. */
export function productionUrl(p: VProject): string | undefined {
  const names = [
    ...(p.alias ?? []).map((a) => a.domain ?? ''),
    ...(p.targets?.production?.alias ?? []),
    ...(p.latestDeployments?.find((d) => d.target === 'production')?.alias ?? []),
  ].filter((a) => a && !a.includes('-git-'));
  if (!names.length) return undefined;
  names.sort((a, b) => Number(a.endsWith('.vercel.app')) - Number(b.endsWith('.vercel.app')) || a.length - b.length);
  return `https://${names[0]}`;
}

export function deployOf(p: VProject): Deploy | undefined {
  const d = productionDeploy(p);
  if (!d) return undefined;
  const state = (d.readyState ?? d.state ?? '').toUpperCase();
  const [label, tone]: [string, Tone] =
    state === 'READY' ? ['Live', 'good']
    : state === 'ERROR' ? ['Build failed', 'bad']
    : state === 'CANCELED' ? ['Canceled', 'muted']
    : ['Building', 'warn'];
  const at = d.createdAt ?? d.created;
  return {
    label,
    tone,
    at: at ? new Date(at).toISOString() : undefined,
    message: d.meta?.githubCommitMessage?.split('\n')[0],
    url: d.url ? `https://${d.url}` : undefined,
  };
}

export async function setPaused(projectId: string, paused: boolean): Promise<void> {
  await request('Vercel', `${API}/v1/projects/${encodeURIComponent(projectId)}/${paused ? 'pause' : 'unpause'}${team('?')}`, {
    method: 'POST',
    headers: headers(),
  });
}
