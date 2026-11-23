import { guard, json } from '../server/guard.js';
import { errorText } from '../server/http.js';
import { runAction, setAiEverywhere, UnknownApp } from '../server/pause.js';

/**
 * POST {action: "pause" | "resume", all: true} or {action, id}: flips the pause switch.
 * POST {action: "ai-off" | "ai-on"}: AI off (or on) in every connected app, sites stay up.
 * Returns what happened per app.
 */
export async function POST(req: Request): Promise<Response> {
  const blocked = guard(req, 'pause', 10);
  if (blocked) return blocked;
  const body = (await req.json().catch(() => null)) as { action?: string; all?: boolean; id?: string } | null;
  const action = body?.action;
  try {
    if (action === 'ai-off' || action === 'ai-on') return json({ results: await setAiEverywhere(action === 'ai-off') });
    if (action !== 'pause' && action !== 'resume') return json({ error: 'Say "pause", "resume", "ai-off" or "ai-on".' }, 400);
    if (!body?.all && typeof body?.id !== 'string') return json({ error: 'Pick an app, or all.' }, 400);
    const results = await runAction(action === 'pause', body.all ? { all: true } : { id: body.id as string });
    return json({ results });
  } catch (e) {
    return json({ error: errorText(e) }, e instanceof UnknownApp ? 404 : 500);
  }
}
