import { guard, json } from '../server/guard.js';
import { errorText } from '../server/http.js';
import { runAction, UnknownApp } from '../server/pause.js';

/** POST {action: "pause" | "resume", all: true} or {action, id}: flips the switch, returns what happened per app. */
export async function POST(req: Request): Promise<Response> {
  const blocked = guard(req, 'pause', 10);
  if (blocked) return blocked;
  const body = (await req.json().catch(() => null)) as { action?: string; all?: boolean; id?: string } | null;
  if (body?.action !== 'pause' && body?.action !== 'resume') return json({ error: 'Say "pause" or "resume".' }, 400);
  if (!body.all && typeof body.id !== 'string') return json({ error: 'Pick an app, or all.' }, 400);
  try {
    const results = await runAction(body.action === 'pause', body.all ? { all: true } : { id: body.id as string });
    return json({ results });
  } catch (e) {
    return json({ error: errorText(e) }, e instanceof UnknownApp ? 404 : 500);
  }
}
