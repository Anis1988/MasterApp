// Vercel: your projects (matched to repos), their production deploy, and the pause switch.
// Pausing makes Vercel answer every visit with 503 (DEPLOYMENT_PAUSED): no traffic, no functions, no cron.
// Needs VERCEL_TOKEN (vercel.com → Account Settings → Tokens). Teams are found on their own; VERCEL_TEAM_ID pins one.

import { cached } from './cache.js';
import { getJson, request } from './http.js';
import type { Deploy, Tone } from './types.js';

const API = 'https://api.vercel.com';
export const hasVercel = () => !!process.env.VERCEL_TOKEN;

const headers = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.VERCEL_TOKEN ?? ''}`,
  'Content-Type': 'application/json',
});
const q = (teamId: string | undefined, sep: '?' | '&') => (teamId ? `${sep}teamId=${encodeURIComponent(teamId)}` : '');

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
  /** Added by Master: the team the project lives in (none = your own account) and its slug, for links. */
  teamId?: string;
  scopeSlug?: string;
}

interface Scope {
  teamId?: string;
  slug: string;
}

/**
 * Where your projects live: VERCEL_TEAM_ID when it's set, otherwise your own account plus every team you're in
 * (Hobby accounts now keep their projects in a team, like "anis-s-team1"). Kept an hour.
 */
export function scopes(): Promise<Scope[]> {
  return cached('v:scopes', 3_600_000, async () => {
    const id = process.env.VERCEL_TEAM_ID;
    if (id) {
      const t = await getJson<{ id: string; slug: string }>('Vercel', `${API}/v2/teams/${encodeURIComponent(id)}`, { headers: headers() });
      return [{ teamId: t.id, slug: t.slug }];
    }
    const [user, teams] = await Promise.all([
      getJson<{ user: { username: string } }>('Vercel', `${API}/v2/user`, { headers: headers() }).catch(() => null),
      getJson<{ teams?: { id: string; slug: string }[] }>('Vercel', `${API}/v2/teams?limit=20`, { headers: headers() }).catch(() => null),
    ]);
    const list: Scope[] = (teams?.teams ?? []).map((t) => ({ teamId: t.id, slug: t.slug }));
    if (user) list.push({ slug: user.user.username });
    if (!list.length) throw new Error('Vercel: the token can’t see your account or teams (wrong or expired VERCEL_TOKEN?)');
    return list;
  });
}

async function projectsIn(scope: Scope): Promise<VProject[]> {
  const all: VProject[] = [];
  let from: number | undefined;
  for (let page = 0; page < 5; page++) {
    const j = await getJson<{ projects?: VProject[]; pagination?: { next?: number | null } }>(
      'Vercel',
      `${API}/v10/projects?limit=100${from ? `&from=${from}` : ''}${q(scope.teamId, '&')}`,
      { headers: headers() },
    );
    all.push(...(j.projects ?? []).map((p) => ({ ...p, teamId: scope.teamId, scopeSlug: scope.slug })));
    if (!j.pagination?.next) break;
    from = j.pagination.next;
  }
  return all;
}

/** Every project in every scope the token can see. A scope that refuses is skipped if another one answers. */
export async function projects(): Promise<VProject[]> {
  const list = await scopes();
  const results = await Promise.allSettled(list.map(projectsIn));
  const ok = results.filter((r): r is PromiseFulfilledResult<VProject[]> => r.status === 'fulfilled');
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  const seen = new Set<string>();
  return ok.flatMap((r) => r.value).filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

export const dashboardOf = (p: VProject) => (p.scopeSlug ? `https://vercel.com/${p.scopeSlug}/${p.name}` : 'https://vercel.com/dashboard');

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

export async function setPaused(projectId: string, paused: boolean, teamId?: string): Promise<void> {
  await request('Vercel', `${API}/v1/projects/${encodeURIComponent(projectId)}/${paused ? 'pause' : 'unpause'}${q(teamId, '?')}`, {
    method: 'POST',
    headers: headers(),
  });
}
