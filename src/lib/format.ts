import type { Platform } from '../../server/types';

/** "3 h ago" style, from an ISO date. */
export function ago(iso?: string | null): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const min = Math.max(0, (Date.now() - t) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.floor(min)} min ago`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)} d ago`;
  const mo = d / 30.4;
  if (mo < 12) return `${Math.floor(mo)} mo ago`;
  return `${Math.floor(mo / 12)} y ago`;
}

export const usd = (n?: number) =>
  n == null ? '—' : n < 100 ? `$${n.toFixed(2)}` : `$${Math.round(n).toLocaleString('en-US')}`;

export const platformName = (p?: Platform) =>
  p === 'vercel' ? 'Vercel' : p === 'netlify' ? 'Netlify' : p === 'github-pages' ? 'GitHub Pages' : p === 'github-releases' ? 'GitHub releases' : undefined;

export const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
