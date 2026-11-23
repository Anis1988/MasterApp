import { guard, json } from '../server/guard.js';
import { errorText } from '../server/http.js';
import { getStatus } from '../server/status.js';

/** GET [?fresh=1]: everything on the dashboard (kept 45 s unless fresh). */
export async function GET(req: Request): Promise<Response> {
  const blocked = guard(req, 'status', 30);
  if (blocked) return blocked;
  try {
    return json(await getStatus(new URL(req.url).searchParams.get('fresh') === '1'));
  } catch (e) {
    return json({ error: errorText(e) }, 500);
  }
}
