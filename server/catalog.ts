import type { AppDef } from './types.js';

/**
 * Your apps (from a scan of github.com/Anis1988, Nov 2026). Old practice repos from 2020–2024, Daily-News
 * (a NewsAPI demo) and aionmeter-logs (data only) are left out on purpose.
 *
 * To add one: copy a line, set `repo` to the GitHub repo name. Vercel and Netlify are matched by repo, so the
 * deploy status, the address and the pause switch are found on their own. Vercel projects and Netlify sites that
 * are not in this list still show up under "Also on Vercel / Netlify".
 */
export const CATALOG: AppDef[] = [
  // ── My apps: "Pause everything" stops these ─────────────────────────────────────────────────────────────
  { id: 'lifetracker', name: 'LifeTracker', icon: '🪐', repo: 'LifeTracker', group: 'mine', url: 'https://anis1988.github.io/LifeTracker/', hint: 'github-pages',
    about: 'Bills, subscriptions, renewals and spending', runsOnItsOwn: 'Supabase server functions' },
  { id: 'trend-videos', name: 'Trend Videos', icon: '🎬', repo: 'Tiktok-Trend', group: 'mine', url: 'https://trend-video.netlify.app',
    about: 'Daily trend videos for TikTok and YouTube', ai: 'Claude (scripts)', runsOnItsOwn: 'GitHub Actions 3× a day (10am, 2pm, 6pm)' },
  { id: 'trading', name: 'Trading', icon: '📈', repo: 'Trading', group: 'mine', url: 'https://tradinganis.netlify.app',
    about: 'Watchlist news → buy/sell signals and alerts', ai: 'Claude', runsOnItsOwn: 'Netlify scheduled functions (brief, watch, weekly)' },
  { id: 'scam-check', name: 'Scam Check', icon: '🛡️', repo: 'Scam-Check', group: 'mine', url: 'https://scamcheck-anis.vercel.app',
    about: 'Is this message a scam?', ai: 'Gemini, Groq, Claude' },
  { id: 'calorie-tracker', name: 'CalorieTracker', icon: '🥗', repo: 'CalorieTracker', group: 'mine', url: 'https://calorie-tracker-roza.vercel.app',
    about: 'Food photos → calories, plus beauty and cooking', ai: 'Gemini, Claude' },
  { id: 'watt-watch', name: 'Watt Watch', icon: '⚡', repo: 'DukeEnergy', group: 'mine', url: 'https://duke-energy-anis.vercel.app',
    about: 'Duke Energy usage, costs and supplier deals', ai: 'Claude', runsOnItsOwn: 'Vercel cron: daily alerts' },
  { id: 'cv-studio', name: 'CV Studio', icon: '📄', repo: 'CV', group: 'mine',
    about: 'ATS-ready resumes with an AI assistant', ai: 'Claude' },
  { id: 'taxfilling', name: 'TaxFilling', icon: '🧾', repo: 'TaxFilling', group: 'mine',
    about: 'W-2 scan, e-file or print-and-mail, AI helper', ai: 'AI assistant' },
  { id: 'master', name: 'Master', icon: '🛰️', repo: 'MasterApp', group: 'mine', self: true,
    about: 'This dashboard' },

  // ── Phone & PC apps (shipped as GitHub releases) ─────────────────────────────────────────────────────────
  { id: 'house', name: 'House', icon: '🏠', repo: 'House', group: 'device', hint: 'github-releases',
    about: 'Android app for the smart home: LIFX lights, LG TV and more' },
  { id: 'lg-tv', name: 'LG TV Remote', icon: '📺', repo: 'LG_TV', group: 'device', hint: 'github-releases',
    about: 'Phone and PC remote for the LG TV' },
  { id: 'aionmeter', name: 'Aion Meter', icon: '⚔️', repo: 'AionMeter', group: 'device', hint: 'github-releases',
    about: 'DPS meter overlay for Aion 4.8 (Windows)' },
  { id: 'all-in-one', name: 'All-in-one', icon: '📱', repo: 'app', group: 'device',
    about: 'Expo / React Native app' },

  // ── Websites (public, often for clients): never in "Pause everything" ──────────────────────────────────
  { id: 'hannane-cooking', name: 'Hannane Cooking', icon: '🍲', repo: 'HannaneCooking', group: 'sites',
    about: 'Home batch-cooking site (French)', ai: 'Claude' },
  { id: 'carloaner', name: 'CarLoaner', icon: '🚗', repo: 'CarLoaner', group: 'sites',
    about: 'Car rental site for an agency in Algeria' },
  { id: 'income-tax', name: 'Issad Income Tax', icon: '💼', repo: 'IncomeTax', group: 'sites',
    about: 'Tax consultation website' },
  { id: 'insurance', name: 'Issad Insurance', icon: '☂️', repo: 'Insurance', group: 'sites',
    about: 'Insurance website' },
  { id: 'roza', name: 'Roza Medini UGC', icon: '🎥', repo: 'Roza_Website', group: 'sites',
    about: 'UGC portfolio site' },
  { id: 'tamazight', name: 'Teaching Tamazight', icon: '📚', repo: 'Teaching_Tamazigh', group: 'sites',
    about: 'Tamazight teacher site' },
  { id: 'renovation', name: 'Massie Renovation', icon: '🔨', repo: 'Renovation', group: 'sites',
    about: 'Renovation company site' },
  { id: 'launch-portal', name: 'Project Launch Portal', icon: '🚀', repo: 'AnisWebsite', group: 'sites',
    about: 'Client intake + domain purchase portal' },
];
