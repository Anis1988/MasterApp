/**
 * Master kill switch, for an app's server code (Vercel or Netlify functions, Node scripts).
 * Copy this file into the app, set APP_ID to the app's id in Master (server/catalog.ts), then:
 *   await stopIfPaused('ai')    before calling an AI
 *   await stopIfPaused('work')  at the start of a cron job / scheduled function / email send
 * The answer is kept 30 s. If Master can't be reached the app carries on (fail-open).
 * MASTER_URL (env) overrides the address; MASTER_SWITCH=off turns the check off.
 */
const APP_ID = 'your-app-id';
const MASTER_URL = (process.env.MASTER_URL || 'https://master-app-anis-s-team1.vercel.app').replace(/\/$/, '');

export type MasterSwitch = { ai: boolean; work: boolean };
let last: { at: number; s: MasterSwitch } | null = null;

export async function masterSwitch(): Promise<MasterSwitch> {
  if (process.env.MASTER_SWITCH === 'off') return { ai: false, work: false };
  if (last && Date.now() - last.at < 30_000) return last.s;
  try {
    const res = await fetch(`${MASTER_URL}/api/flags?app=${APP_ID}`, { signal: AbortSignal.timeout(1500) });
    const j = (await res.json()) as Partial<MasterSwitch>;
    last = { at: Date.now(), s: { ai: j.ai === true, work: j.work === true } };
    return last.s;
  } catch {
    return last?.s ?? { ai: false, work: false };
  }
}

export class PausedByMaster extends Error {
  constructor(what: 'ai' | 'work') {
    super(what === 'ai' ? 'AI is paused from Master right now. Try again later.' : 'This app is paused from Master right now.');
    this.name = 'PausedByMaster';
  }
}

/** Throws PausedByMaster when Master says stop. */
export async function stopIfPaused(what: 'ai' | 'work'): Promise<void> {
  if ((await masterSwitch())[what]) throw new PausedByMaster(what);
}
