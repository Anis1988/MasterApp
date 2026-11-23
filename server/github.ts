// GitHub: last commit, latest release, latest Actions run, and the scheduled workflows (the pause switch for
// jobs that run on their own, like Trend Videos' daily video). Needs GITHUB_TOKEN (read: contents, metadata,
// actions; write: actions, to turn scheduled workflows off and on).

import { cached } from './cache.js';
import { getJson, HttpError, request } from './http.js';
import type { RepoInfo, Schedule, Tone } from './types.js';

const API = 'https://api.github.com';
export const OWNER = process.env.GITHUB_OWNER || 'Anis1988';
export const hasGitHub = () => !!process.env.GITHUB_TOKEN;

const headers = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ''}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'MasterApp',
});

const repoPath = (repo: string) => `${API}/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(repo)}`;

interface GqlRepo {
  url: string;
  isPrivate: boolean;
  pushedAt: string | null;
  defaultBranchRef: { target: { messageHeadline?: string; committedDate?: string; url?: string } | null } | null;
  latestRelease: { tagName: string; publishedAt: string | null; url: string } | null;
}

/** One GraphQL call for every repo: url, private?, last push, last commit, latest release. Key: repo in lower case. */
export async function repoBasics(repos: string[]): Promise<Map<string, RepoInfo>> {
  const fields =
    'url isPrivate pushedAt defaultBranchRef { target { ... on Commit { messageHeadline committedDate url } } } latestRelease { tagName publishedAt url }';
  const query = `query {\n${repos
    .map((r, i) => `r${i}: repository(owner: ${JSON.stringify(OWNER)}, name: ${JSON.stringify(r)}) { ${fields} }`)
    .join('\n')}\n}`;
  const res = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(12_000),
  }).catch((e: unknown) => {
    throw new HttpError(`GitHub: ${e instanceof Error ? e.message : String(e)}`, 0);
  });
  const body = (await res.json().catch(() => null)) as
    | { data?: Record<string, GqlRepo | null> | null; errors?: { message: string }[]; message?: string }
    | null;
  if (!res.ok || !body?.data) {
    const hint = res.status === 401 ? ' (GITHUB_TOKEN missing, wrong or expired)' : '';
    throw new HttpError(`GitHub: ${body?.errors?.[0]?.message ?? body?.message ?? `HTTP ${res.status}`}${hint}`, res.status);
  }
  const data = body.data;
  const out = new Map<string, RepoInfo>();
  repos.forEach((repo, i) => {
    const g = data[`r${i}`];
    if (!g) return;
    const c = g.defaultBranchRef?.target;
    out.set(repo.toLowerCase(), {
      url: g.url,
      private: g.isPrivate,
      pushedAt: g.pushedAt ?? undefined,
      commit: c?.committedDate ? { message: c.messageHeadline ?? '', at: c.committedDate, url: c.url ?? g.url } : undefined,
      release: g.latestRelease
        ? { tag: g.latestRelease.tagName, at: g.latestRelease.publishedAt ?? '', url: g.latestRelease.url }
        : undefined,
    });
  });
  return out;
}

interface Run {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

/** The newest GitHub Actions run (any workflow). */
export async function latestRun(repo: string): Promise<RepoInfo['ci']> {
  const j = await getJson<{ workflow_runs?: Run[] }>(
    'GitHub',
    `${repoPath(repo)}/actions/runs?per_page=1&exclude_pull_requests=true`,
    { headers: headers() },
  );
  const r = j.workflow_runs?.[0];
  if (!r) return undefined;
  let tone: Tone = 'muted';
  let label = r.conclusion ?? r.status;
  if (r.status !== 'completed') {
    tone = 'warn';
    label = r.status === 'in_progress' ? 'running' : 'waiting';
  } else if (r.conclusion === 'success') {
    tone = 'good';
    label = 'passed';
  } else if (r.conclusion === 'failure' || r.conclusion === 'timed_out' || r.conclusion === 'startup_failure') {
    tone = 'bad';
    label = r.conclusion === 'timed_out' ? 'timed out' : 'failed';
  } else if (r.conclusion === 'cancelled' || r.conclusion === 'skipped') {
    label = r.conclusion;
  }
  return { name: r.name, label, tone, at: r.updated_at || r.created_at, url: r.html_url };
}

interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

/** Does this workflow file run on a timer (`on: schedule`)? Files rarely change: kept an hour. */
function isScheduled(repo: string, path: string): Promise<boolean> {
  return cached(`gh:sched:${repo}:${path}`.toLowerCase(), 3_600_000, async () => {
    const j = await getJson<{ content?: string; encoding?: string }>(
      'GitHub',
      `${repoPath(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: headers() },
    );
    const text = j.encoding === 'base64' && j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
    return /^\s*-?\s*schedule\s*:/m.test(text) || /\bon\s*:\s*\[[^\]]*\bschedule\b/.test(text);
  });
}

/** Workflows of this repo that run on a timer, and whether each is on. */
export async function schedules(repo: string): Promise<Schedule[]> {
  const j = await getJson<{ workflows?: Workflow[] }>('GitHub', `${repoPath(repo)}/actions/workflows?per_page=100`, {
    headers: headers(),
  });
  const list = (j.workflows ?? []).filter((w) => w.path.startsWith('.github/workflows/') && w.state !== 'deleted');
  const timed = await Promise.all(list.map((w) => isScheduled(repo, w.path).catch(() => false)));
  return list.filter((_, i) => timed[i]).map((w) => ({ id: w.id, name: w.name, path: w.path, on: w.state === 'active' }));
}

/** Turn a workflow off (it stops running on its timer) or back on. */
export async function setWorkflow(repo: string, id: number, on: boolean): Promise<void> {
  await request('GitHub', `${repoPath(repo)}/actions/workflows/${id}/${on ? 'enable' : 'disable'}`, {
    method: 'PUT',
    headers: headers(),
  });
}
