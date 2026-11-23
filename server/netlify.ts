// Netlify: your sites (matched to repos by their linked GitHub repo) and their latest deploy.
// Netlify has no "pause site" switch in its API, so Netlify apps can't be paused from here.
// Needs NETLIFY_TOKEN (app.netlify.com → User settings → Applications → Personal access tokens).

import { getJson } from './http.js';
import type { Deploy, Tone } from './types.js';

const API = 'https://api.netlify.com/api/v1';
export const hasNetlify = () => !!process.env.NETLIFY_TOKEN;

const headers = (): Record<string, string> => ({
  Authorization: `Bearer ${process.env.NETLIFY_TOKEN ?? ''}`,
  'User-Agent': 'MasterApp',
});

interface NDeploy {
  state?: string;
  created_at?: string;
  published_at?: string | null;
  title?: string | null;
  error_message?: string | null;
}

export interface NSite {
  id: string;
  name: string;
  url?: string;
  ssl_url?: string;
  admin_url?: string;
  build_settings?: { repo_url?: string | null; repo_path?: string | null } | null;
  published_deploy?: NDeploy | null;
}

export const sites = () => getJson<NSite[]>('Netlify', `${API}/sites?filter=all&per_page=100`, { headers: headers() });

export async function latestDeploy(siteId: string): Promise<NDeploy | undefined> {
  const list = await getJson<NDeploy[]>('Netlify', `${API}/sites/${encodeURIComponent(siteId)}/deploys?per_page=1`, {
    headers: headers(),
  });
  return list?.[0];
}

/** Linked GitHub repo name in lower case ("Anis1988/Trading" → "trading"). */
export function repoOf(s: NSite): string | undefined {
  const path = s.build_settings?.repo_path || s.build_settings?.repo_url?.replace(/^https?:\/\/github\.com\//i, '');
  return path?.split('/')[1]?.replace(/\.git$/, '').toLowerCase() || undefined;
}

export function deployOf(d: NDeploy | null | undefined): Deploy | undefined {
  if (!d?.state) return undefined;
  const [label, tone]: [string, Tone] =
    d.state === 'ready' ? ['Live', 'good']
    : d.state === 'error' ? ['Build failed', 'bad']
    : d.state === 'skipped' || d.state === 'rejected' ? [d.state, 'muted']
    : ['Building', 'warn'];
  return {
    label,
    tone,
    at: d.published_at || d.created_at || undefined,
    message: d.error_message || d.title || undefined,
  };
}
