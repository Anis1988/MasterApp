// The pause switch. Pause = Vercel stops serving the site (503, no functions, no cron) and scheduled GitHub
// workflows are turned off. Resume = the opposite. Websites for clients and this dashboard are never in "all".

import { forget } from './cache.js';
import { setWorkflow } from './github.js';
import { errorText } from './http.js';
import { getStatus } from './status.js';
import type { ActionResult, AppStatus } from './types.js';
import { setPaused } from './vercel.js';

export class UnknownApp extends Error {}

async function apply(a: AppStatus, pause: boolean): Promise<ActionResult> {
  const did: string[] = [];
  const errors: string[] = [];
  if (!a.pausable) return { id: a.id, name: a.name, ok: false, did, errors: ['Nothing here can be paused from this dashboard.'] };

  if (a.host?.platform === 'vercel' && a.host.id && !a.self) {
    if (!!a.host.paused === pause) did.push(pause ? 'Vercel site was already paused' : 'Vercel site was already on');
    else {
      try {
        await setPaused(a.host.id, pause);
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
  const results = await Promise.all(list.map((a) => apply(a, pause)));
  forget('status');
  return results;
}
