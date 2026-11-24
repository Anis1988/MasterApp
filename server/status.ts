// Everything on the dashboard, in one answer: each app's site, deploy, code, checks, jobs, plus spend and setup.

import { cached } from './cache.js';
import { CATALOG } from './catalog.js';
import { hasKv, lastSeen, readFlags, resolve, type Flags } from './flags.js';
import { hasGitHub, latestRun, OWNER, repoBasics, schedules } from './github.js';
import { errorText } from './http.js';
import { deployOf as netlifyDeploy, hasNetlify, latestDeploy, repoOf as netlifyRepo, sites, type NSite } from './netlify.js';
import { getSpend } from './spend.js';
import type { AppDef, AppStatus, Extra, HostInfo, RepoInfo, SetupItem, SiteCheck, Status, Tone } from './types.js';
export type { Flags };
import { checkSite } from './uptime.js';
import { dashboardOf, deployOf as vercelDeploy, hasVercel, productionUrl, projects, repoOf as vercelRepo, type VProject } from './vercel.js';

export const getStatus = (fresh = false) => cached('status', 45_000, buildStatus, fresh);

const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).host.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
};

async function buildStatus(): Promise<Status> {
  const problems = new Set<string>();
  const soft = <T>(p: Promise<T>): Promise<T | undefined> =>
    p.catch((e: unknown) => {
      problems.add(errorText(e));
      return undefined;
    });

  // Apps that ask Master for the kill switch: your own apps, never this dashboard.
  const switchIds = CATALOG.filter((a) => a.group === 'mine' && !a.self).map((a) => a.id);
  let killError: string | undefined;
  const fromKv = <T>(p: Promise<T>): Promise<T | undefined> =>
    p.catch((e: unknown) => {
      killError = errorText(e);
      return undefined;
    });

  const [basics, vprojects, nsites, spend, flags, seen] = await Promise.all([
    hasGitHub() ? soft(repoBasics(CATALOG.map((a) => a.repo))) : Promise.resolve(undefined),
    hasVercel() ? soft(projects()) : Promise.resolve(undefined),
    hasNetlify() ? soft(sites()) : Promise.resolve(undefined),
    getSpend(),
    hasKv() ? fromKv(readFlags()) : Promise.resolve(undefined),
    hasKv() ? fromKv(lastSeen(switchIds)) : Promise.resolve(undefined),
  ]);
  const kvOn = !!flags;

  const vByRepo = new Map<string, VProject>();
  for (const p of vprojects ?? []) {
    const r = vercelRepo(p);
    if (r && !vByRepo.has(r)) vByRepo.set(r, p);
  }
  const nByRepo = new Map<string, NSite>();
  for (const s of nsites ?? []) {
    const r = netlifyRepo(s);
    if (r && !nByRepo.has(r)) nByRepo.set(r, s);
  }

  async function one(def: AppDef): Promise<AppStatus> {
    const key = def.repo.toLowerCase();
    const notes: string[] = [];
    const found = basics?.get(key);
    const repoInfo: RepoInfo | undefined = found ? { ...found } : undefined;
    if (basics && !found) notes.push(`GitHub repo ${OWNER}/${def.repo} not found (renamed, or GITHUB_TOKEN can't see it).`);

    // Where it's hosted. If a repo is on both, the one serving the address in the catalog wins.
    const vp = vByRepo.get(key);
    const ns = nByRepo.get(key);
    const useNetlify = !!ns && (!vp || (!!def.url && hostOf(def.url) === hostOf(ns.ssl_url ?? ns.url)));
    let host: HostInfo | undefined;
    if (vp && !useNetlify) {
      host = { platform: 'vercel', id: vp.id, teamId: vp.teamId, name: vp.name, dashboard: dashboardOf(vp), url: productionUrl(vp), deploy: vercelDeploy(vp), paused: !!vp.paused };
    } else if (ns) {
      const latest = await latestDeploy(ns.id).catch(() => undefined);
      host = {
        platform: 'netlify',
        id: ns.id,
        name: ns.name,
        dashboard: ns.admin_url ?? `https://app.netlify.com/sites/${ns.name}`,
        url: ns.ssl_url ?? ns.url,
        deploy: netlifyDeploy(latest ?? ns.published_deploy),
      };
    } else if (def.hint) {
      host = { platform: def.hint };
    }

    const url = def.url || host?.url;
    const [ci, jobs, site] = await Promise.all([
      repoInfo ? soft(latestRun(def.repo)) : Promise.resolve(undefined),
      repoInfo && def.group === 'mine' && !def.self ? soft(schedules(def.repo)) : Promise.resolve(undefined),
      url && def.group !== 'device' ? checkSite(url) : Promise.resolve(undefined),
    ]);
    if (repoInfo) {
      repoInfo.ci = ci;
      repoInfo.schedules = jobs;
    }
    if (host?.platform === 'github-pages' && ci) {
      host.deploy = { label: ci.tone === 'good' ? 'Live' : ci.tone === 'bad' ? 'Deploy failed' : ci.label, tone: ci.tone, at: ci.at, url: ci.url };
    }
    if (host?.platform === 'github-releases' && repoInfo?.release) {
      const r = repoInfo.release;
      host.deploy = { label: `Release ${r.tag}`, tone: 'good', at: r.at, url: r.url };
    }

    const onVercel = host?.platform === 'vercel' && !!host.id && !def.self;
    const timed = jobs ?? [];
    const switchable = kvOn && switchIds.includes(def.id);
    const sw = switchable && flags ? resolve(flags, def.id) : undefined;
    const kill = sw ? { ai: sw.ai, work: sw.work, seenAt: seen?.[def.id] ?? null } : undefined;
    const pausable = !def.self && (onVercel || timed.length > 0 || switchable);
    const hardPaused = onVercel ? !!host?.paused : timed.length > 0 && timed.every((s) => !s.on);
    const paused = !!kill?.work || hardPaused;
    const inPauseAll = pausable && (def.inPauseAll ?? def.group === 'mine');

    if (switchable && !kill?.seenAt) {
      if (paused && !hardPaused) notes.push('Paused here, but this app isn’t connected to the kill switch yet, so it keeps running. See the Guide.');
    } else if (def.group === 'mine' && !def.self && !pausable) {
      if (host?.platform === 'netlify')
        notes.push(def.runsOnItsOwn
          ? 'Netlify has no pause switch, so its scheduled functions keep running. Connect it to the kill switch to stop them.'
          : 'Netlify sites can’t be paused from here.');
      else if (host?.platform === 'github-pages') notes.push('GitHub Pages sites can’t be paused (they’re free).');
      else if (!host && (hasVercel() || hasNetlify())) notes.push('Not found on Vercel or Netlify: not deployed yet, or under another account.');
    }
    if (kill?.ai && !paused) notes.push('AI is off for this app (kill switch). The site stays up.');
    if (def.self) notes.push('Never paused by this dashboard.');

    const [tone, summary] = verdict(paused, site, host?.deploy?.tone, repoInfo?.ci?.tone);
    return { ...def, host, repoInfo, site, kill, paused, pausable, inPauseAll, tone, summary, notes };
  }

  const apps = await Promise.all(CATALOG.map(one));

  const known = new Set(CATALOG.map((a) => a.repo.toLowerCase()));
  const extras: Extra[] = [
    ...(vprojects ?? [])
      .filter((p) => !known.has(vercelRepo(p) ?? ''))
      .map((p): Extra => ({ platform: 'vercel', name: p.name, url: productionUrl(p), dashboard: dashboardOf(p), deploy: vercelDeploy(p), paused: !!p.paused })),
    ...(nsites ?? [])
      .filter((s) => !known.has(netlifyRepo(s) ?? ''))
      .map((s): Extra => ({ platform: 'netlify', name: s.name, url: s.ssl_url ?? s.url, dashboard: s.admin_url, deploy: netlifyDeploy(s.published_deploy) })),
  ];

  const setup: SetupItem[] = [
    { key: 'APP_ACCESS_TOKEN', ok: true, required: true, unlocks: 'The access code you type to open this page' },
    { key: 'GITHUB_TOKEN', ok: hasGitHub(), required: false, unlocks: 'Commits, releases, checks, and turning scheduled jobs off and on' },
    { key: 'VERCEL_TOKEN', ok: hasVercel(), required: false, unlocks: 'Deploy status, addresses and the pause switch for Vercel apps' },
    { key: 'NETLIFY_TOKEN', ok: hasNetlify(), required: false, unlocks: 'Deploy status for Netlify sites' },
    { key: 'ANTHROPIC_ADMIN_KEY', ok: !!process.env.ANTHROPIC_ADMIN_KEY, required: false, unlocks: 'Claude spend for all your apps together' },
    { key: 'KV_REST_API_URL', ok: hasKv(), required: false, unlocks: 'The kill switch every app checks (Vercel → Storage → Upstash Redis → connect to this project)' },
  ];

  const killStatus: Status['kill'] = {
    configured: kvOn,
    aiOff: !!flags?.all.ai,
    connected: switchIds.filter((id) => !!seen?.[id]).length,
    of: switchIds.length,
    updatedAt: flags?.updatedAt,
    error: hasKv() ? killError : undefined,
  };
  if (killError) problems.add(killError);

  return { at: new Date().toISOString(), owner: OWNER, apps, extras, spend, setup, kill: killStatus, errors: [...problems] };
}

const rank: Record<Tone, number> = { bad: 3, warn: 2, good: 1, muted: 0 };

/**
 * One health colour per app (owner's rule): the ring round its icon, its card edge, its label and the site dot.
 * green (good) = live and nothing wrong · yellow (warn) = live, but something is wrong (last build failed: the
 * previous version is still served; checks failing; slow) · red (bad) = offline, not working at all (the site
 * doesn't answer or answers with an error). Paused on purpose = purple (`paused` on the client); no data = grey.
 * Apps without a site to check (phone & PC apps) are never red: there's nothing to be offline.
 */
function verdict(paused: boolean, site: SiteCheck | undefined, deploy?: Tone, checks?: Tone): [Tone, string] {
  if (paused) return ['muted', 'Paused'];
  if (site && !site.ok) return site.label === 'Paused' ? ['muted', 'Site paused'] : ['bad', 'Offline'];
  if (deploy === 'bad') return ['warn', 'Last build failed'];
  if (checks === 'bad') return ['warn', 'Checks failing'];
  if (site?.tone === 'warn') return ['warn', 'Slow'];
  if (deploy === 'warn') return ['good', 'Deploying'];
  const best = [deploy, checks, site?.tone].reduce<number>((m, t) => Math.max(m, t ? rank[t] : 0), 0);
  return best >= 1 ? ['good', 'All good'] : ['muted', 'No data yet'];
}
