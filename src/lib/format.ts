import type { Platform, Tone } from '../../server/types';

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

/** "CalorieTracker" → "CT", "Scam Check" → "SC", "Master" → "M". */
export const initials = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const GLYPHS: [string, string][] = [
  ['#f97316', '#ec4899'], ['#ec4899', '#8b5cf6'], ['#f59e0b', '#ef4444'], ['#06b6d4', '#3b82f6'], ['#22c55e', '#06b6d4'],
  ['#eab308', '#f97316'], ['#6366f1', '#8b5cf6'], ['#0ea5e9', '#6366f1'], ['#14b8a6', '#22c55e'], ['#a855f7', '#ec4899'],
];

/** Colourful badge for an app; greyed when paused. */
export const glyphBg = (index: number, paused = false) => {
  if (paused) return 'linear-gradient(145deg, #a78bfa, #64748b)';
  const [a, b] = GLYPHS[index % GLYPHS.length];
  return `linear-gradient(145deg, ${a}, ${b})`;
};

/** The CSS class for a status colour: paused wins over everything. */
export const toneClass = (tone: Tone, paused = false) => (paused ? 'paused' : tone);
