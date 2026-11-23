// Shared by the server functions (api/, server/) and the website (src/, type-only imports).

export type Group = 'mine' | 'device' | 'sites';
export type Tone = 'good' | 'warn' | 'bad' | 'muted';
export type Platform = 'vercel' | 'netlify' | 'github-pages' | 'github-releases';

/** One of your apps, as listed in server/catalog.ts. */
export interface AppDef {
  id: string;
  name: string;
  icon: string;
  /** GitHub repository name under GITHUB_OWNER (letter case does not matter). */
  repo: string;
  group: Group;
  about: string;
  /** Public address. Empty = taken from Vercel / Netlify when they know it. */
  url?: string;
  /** Where it should live when Vercel / Netlify don't know it (GitHub Pages, GitHub releases). */
  hint?: Platform;
  /** Which AI it pays for, in plain words. */
  ai?: string;
  /** What runs by itself (cron, scheduled jobs), in plain words. */
  runsOnItsOwn?: string;
  /** "Pause everything" includes it. Default: yes for "mine", no for websites and phone/PC apps. */
  inPauseAll?: boolean;
  /** This dashboard itself: never paused. */
  self?: boolean;
}

export interface Deploy {
  label: string;
  tone: Tone;
  at?: string;
  message?: string;
  url?: string;
}

export interface HostInfo {
  platform: Platform;
  id?: string;
  name?: string;
  dashboard?: string;
  url?: string;
  deploy?: Deploy;
  paused?: boolean;
  /** Vercel team the project lives in (none = your own account). */
  teamId?: string;
}

export interface Schedule {
  id: number;
  name: string;
  path: string;
  on: boolean;
}

export interface RepoInfo {
  url: string;
  private?: boolean;
  pushedAt?: string;
  commit?: { message: string; at: string; url: string };
  ci?: { name: string; label: string; tone: Tone; at: string; url: string };
  release?: { tag: string; at: string; url: string };
  schedules?: Schedule[];
}

export interface SiteCheck {
  url: string;
  ok: boolean;
  status: number;
  ms: number;
  label: string;
  tone: Tone;
}

export interface AppStatus extends AppDef {
  host?: HostInfo;
  repoInfo?: RepoInfo;
  site?: SiteCheck;
  /** Kill switch: what Master tells this app, and when the app last asked (null = never: not connected yet). */
  kill?: { ai: boolean; work: boolean; seenAt: string | null };
  /** Paused by the kill switch, its Vercel site is paused, or all of its scheduled jobs are off. */
  paused: boolean;
  /** Something here can be paused from this dashboard. */
  pausable: boolean;
  inPauseAll: boolean;
  /** Worst thing going on: drives the coloured dot. */
  tone: Tone;
  summary: string;
  notes: string[];
}

export interface Extra {
  platform: 'vercel' | 'netlify';
  name: string;
  url?: string;
  dashboard?: string;
  deploy?: Deploy;
  paused?: boolean;
}

export interface Spend {
  configured: boolean;
  error?: string;
  monthUsd?: number;
  todayUsd?: number;
  days?: { date: string; usd: number }[];
  top?: { name: string; usd: number }[];
}

export interface SetupItem {
  key: string;
  ok: boolean;
  required: boolean;
  unlocks: string;
}

export interface Status {
  at: string;
  owner: string;
  apps: AppStatus[];
  extras: Extra[];
  spend: Spend;
  setup: SetupItem[];
  /** The kill switch: is the store set up, and is AI off everywhere? */
  kill: { configured: boolean; aiOff: boolean; connected: number; of: number; updatedAt?: string; error?: string };
  errors: string[];
}

export interface ActionResult {
  id: string;
  name: string;
  ok: boolean;
  did: string[];
  errors: string[];
}
