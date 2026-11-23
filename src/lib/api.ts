import type { ActionResult, Status } from '../../server/types';

const CODE_KEY = 'ma.accessCode';
export const getCode = () => {
  try {
    return localStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
};
export const setCode = (c: string) => {
  try {
    localStorage.setItem(CODE_KEY, c.trim());
  } catch {
    /* private mode */
  }
};
export const clearCode = () => {
  try {
    localStorage.removeItem(CODE_KEY);
  } catch {
    /* private mode */
  }
};

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly setup = false) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', 'X-Access-Token': getCode(), ...(init?.headers ?? {}) } });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection.', 0);
  }
  const raw = await res.text().catch(() => '');
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* not JSON */
  }
  const body = data as { error?: string; setup?: boolean } | null;
  if (!res.ok || data === null) throw new ApiError(body?.error ?? `The server didn't answer (HTTP ${res.status}).`, res.status, !!body?.setup);
  return data as T;
}

export const fetchStatus = (fresh = false) => call<Status>(`/api/status${fresh ? '?fresh=1' : ''}`);

export type Target = { all: true } | { id: string };
export const flip = (action: 'pause' | 'resume', target: Target) =>
  call<{ results: ActionResult[] }>('/api/pause', { method: 'POST', body: JSON.stringify({ action, ...target }) });
