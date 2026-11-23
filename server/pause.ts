// The pause switch. Pause = the kill switch tells the app to stop AI and background work (any host, Netlify too),
// Vercel stops serving the site (503, no functions, no cron) and scheduled GitHub workflows are turned off.
// Resume = the opposite. Websites for clients and this dashboard are never in "all".
// "AI off everywhere" only flips the kill switch's AI flag: sites stay up, connected apps stop calling AI.

import { forget } from './cache.js';
import { hasKv, updateFlags } from './flags.js';
import { setWorkflow } from './github.js';
import { errorText } from './http.js';
import { getStatus } from './status.js';
import type { ActionResult, AppStatus } from './types.js';
import { setPaused } from './vercel.js';

export class UnknownApp extends Error {}

async function apply(a: AppStatus, pause: boolean, switchNote: string | null): Promise<ActionResult> {
  const did: string[] = [];
  const errors: string[] = [];
  if (!a.pausable) return { id: a.id, name: a.name, ok: false, did, errors: ['Nothing here can be paused from this dashboard.'] };

  if (a.kill) {
    if (switchNote === null) did.push(pause ? 'Kill switch: AI and jobs stopped' : 'Kill switch: cleared');
    else errors.push(`Kill switch: ${switchNote}`);
    if (!a.kill.seenAt) did.push('(app not connected yet, so only the switch changed)');
  }
  if (a.host?.platform === 'vercel' && a.host.id && !a.self) {
    if (!!a.host.paused === pause) did.push(pause ? 'Vercel site was already paused' : 'Vercel site was already on');
    else {
      try {
        await setPaused(a.host.id, pause, a.host.teamId);
        did.push(pause ? 'Vercel site paused' : 'Vercel site back online');
      } catch (e) {
        errors.push(errorText(e));
      }
    }
  }
  for (const s of a.repoInfo?.schedules ?? []) {
    if (s.on === !pause) continue;
    try {
      await setWorkflow(a.repo, s.id, !pause);
      did.push(`${s.name}: ${pause ? 'stopped' : 'running again'}`);
    } catch (e) {
      errors.push(`${s.name}: ${errorText(e)}`);
    }
  }
  return { id: a.id, name: a.name, ok: errors.length === 0, did, errors };
}

export async function runAction(pause: boolean, target: { all: true } | { id: string }): Promise<ActionResult[]> {
  const status = await getStatus(true);
  const list = 'all' in target ? status.apps.filter((a) => a.inPauseAll) : status.apps.filter((a) => a.id === target.id);
  if (!('all' in target) && !list.length) throw new UnknownApp('Unknown app.');

  // The kill switch first, in one write for every app: it's the part that reaches Netlify and AI calls.
  let switchNote: string | null = null;
  const switched = list.filter((a) => a.kill && a.pausable);
  if (switched.length && hasKv()) {
    try {
      const at = new Date().toISOString();
      await updateFlags((f) => {
        for (const a of switched) {
          if (pause) f.apps[a.id] = { ai: true, work: true, reason: 'Paused from Master', at };
          else delete f.apps[a.id];
        }
      });
    } catch (e) {
      switchNote = errorText(e);
    }
  }

  const results = await Promise.all(list.map((a) => apply(a, pause, switchNote)));
  forget('status');
  return results;
}

/** AI off (or back on) for every connected app at once. */
export async function setAiEverywhere(off: boolean): Promise<ActionResult[]> {
  if (!hasKv()) return [{ id: 'ai', name: 'AI everywhere', ok: false, did: [], errors: ['Connect Upstash Redis to Master first (Setup).'] }];
  try {
    await updateFlags((f) => {
      f.all = off ? { ai: true, at: new Date().toISOString() } : { ai: false };
    });
    forget('status');
    return [{ id: 'ai', name: 'AI everywhere', ok: true, did: [off ? 'AI is off in every connected app' : 'AI is back on'], errors: [] }];
  } catch (e) {
    return [{ id: 'ai', name: 'AI everywhere', ok: false, did: [], errors: [errorText(e)] }];
  }
}
