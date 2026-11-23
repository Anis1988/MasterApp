// Small fetch helpers shared by the GitHub / Vercel / Netlify / Anthropic clients.

export class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The error message inside a JSON error body, whatever the service's shape. */
function messageOf(text: string): string {
  try {
    const j = JSON.parse(text) as { message?: string; error?: string | { message?: string } };
    if (typeof j.error === 'string') return j.error;
    return j.error?.message ?? j.message ?? text.slice(0, 160);
  } catch {
    return text.slice(0, 160);
  }
}

export async function request(service: string, url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new HttpError(`${service}: ${timedOut ? `no answer in ${timeoutMs / 1000} s` : errorText(e)}`, 0);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const hint = res.status === 401 ? ' (token missing, wrong or expired)' : res.status === 403 ? ' (the token is not allowed to do this)' : '';
    throw new HttpError(`${service}: HTTP ${res.status}${hint}${text ? ` — ${messageOf(text)}` : ''}`, res.status);
  }
  return res;
}

export async function getJson<T>(service: string, url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<T> {
  const res = await request(service, url, init, timeoutMs);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
