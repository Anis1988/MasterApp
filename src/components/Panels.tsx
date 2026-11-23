import type { Extra, SetupItem, Spend } from '../../server/types';
import { ago, usd } from '../lib/format';
import { Pill } from './ui';

export function SpendCard({ spend }: { spend: Spend }) {
  if (!spend.configured)
    return (
      <section className="card spend">
        <h2>Claude spend</h2>
        <p className="small muted">
          Add <code>ANTHROPIC_ADMIN_KEY</code> to see what all your apps spend on Claude together (Claude Console → Settings → Admin
          keys; organizations only). Until then, check usage in the{' '}
          <a className="link" href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
            Claude Console
          </a>
          .
        </p>
      </section>
    );
  if (spend.error)
    return (
      <section className="card spend">
        <h2>Claude spend</h2>
        <p className="small bad-text">{spend.error}</p>
      </section>
    );
  const days = spend.days ?? [];
  const max = Math.max(0.01, ...days.map((d) => d.usd));
  return (
    <section className="card spend">
      <div className="spend-head">
        <div>
          <p className="label">Claude this month</p>
          <p className="stat-value">{usd(spend.monthUsd)}</p>
        </div>
        <div>
          <p className="label">Today (UTC)</p>
          <p className="stat-value">{usd(spend.todayUsd)}</p>
        </div>
      </div>
      <div className="bars" aria-label="Spend per day, last 14 days">
        {days.map((d) => (
          <div key={d.date} className="bar-col" title={`${d.date}: ${usd(d.usd)}`}>
            <div className="bar" style={{ height: `${Math.max(2, (d.usd / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <p className="muted small">Last 14 days</p>
      {spend.top && spend.top.length > 0 && (
        <ul className="top-models">
          {spend.top.map((t) => (
            <li key={t.name}>
              <span>{t.name}</span>
              <b>{usd(t.usd)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SetupCard({ items }: { items: SetupItem[] }) {
  return (
    <section className="card setup">
      <h2>Setup</h2>
      <p className="small muted">Add these in Vercel → this project → Settings → Environment Variables, then redeploy. The Guide at the bottom says where to get each one.</p>
      <ul>
        {items.map((s) => (
          <li key={s.key}>
            <span className={s.ok ? 'good-text' : 'muted'}>{s.ok ? '✓' : '○'}</span>
            <code>{s.key}</code>
            <span className="muted small">{s.unlocks}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExtrasCard({ extras }: { extras: Extra[] }) {
  return (
    <section className="card extras">
      <h2>Also on Vercel / Netlify</h2>
      <p className="small muted">Projects not in your list (server/catalog.ts). Old ones can be deleted there to keep things tidy.</p>
      <ul>
        {extras.map((e) => (
          <li key={`${e.platform}:${e.name}`}>
            <span className="grow">
              <b>{e.name}</b> <span className="muted small">{e.platform === 'vercel' ? 'Vercel' : 'Netlify'}</span>
            </span>
            {e.paused ? <Pill>Paused</Pill> : e.deploy ? <Pill tone={e.deploy.tone}>{e.deploy.label}</Pill> : null}
            {e.deploy?.at && <span className="muted small">{ago(e.deploy.at)}</span>}
            {e.url && (
              <a className="btn small" href={e.url} target="_blank" rel="noreferrer">
                Open
              </a>
            )}
            {e.dashboard && (
              <a className="btn small" href={e.dashboard} target="_blank" rel="noreferrer">
                Settings
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Guide() {
  return (
    <details className="card guide">
      <summary>
        <h2>Guide</h2>
      </summary>
      <h3>What this page does</h3>
      <p>
        One place for all your apps. Each card shows whether the site answers, the last deploy on Vercel or Netlify, the last code
        change on GitHub, the last automatic check (GitHub Actions) and what runs by itself. It refreshes every minute while open.
        The coloured dot is the worst thing going on: red = down or a failed build, amber = checks failing or building, grey = paused or
        no data.
      </p>
      <h3>The pause switch</h3>
      <p>
        <b>⏸ Pause everything</b> (tap twice) stops your own apps: Vercel sites are paused (visitors see “paused”, nothing runs, so no AI
        credits, emails or cron), and GitHub workflows that run on a timer are turned off (Trend Videos stops making videos).
        <b> ▶ Resume everything</b> turns it all back on. Each card also has its own Pause button. Websites (some are for clients) and this
        page are never in “Pause everything”. Netlify has no pause switch, so Trading’s scheduled functions keep running: stop those in
        the app itself.
      </p>
      <h3>Setting it up (once)</h3>
      <ol>
        <li>
          <code>APP_ACCESS_TOKEN</code>: make up a long password. You type it once on each phone or computer.
        </li>
        <li>
          <code>GITHUB_TOKEN</code>:{' '}
          <a className="link" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">
            new fine-grained token
          </a>{' '}
          → Repository access: <i>All repositories</i> → Permissions: <i>Actions: Read and write</i>, <i>Contents: Read-only</i>.
        </li>
        <li>
          <code>VERCEL_TOKEN</code>:{' '}
          <a className="link" href="https://vercel.com/account/settings/tokens" target="_blank" rel="noreferrer">
            Vercel → Account Settings → Tokens
          </a>{' '}
          → Create (scope: your account). Projects in a team also need <code>VERCEL_TEAM_ID</code>.
        </li>
        <li>
          <code>NETLIFY_TOKEN</code> (optional):{' '}
          <a className="link" href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noreferrer">
            Netlify → Applications → Personal access tokens
          </a>
          .
        </li>
        <li>
          <code>ANTHROPIC_ADMIN_KEY</code> (optional): Claude Console → Settings → Admin keys. Only organizations have admin keys.
        </li>
        <li>Vercel → Deployments → ⋯ → Redeploy, so the new keys are used.</li>
      </ol>
      <h3>Adding an app</h3>
      <p>
        Add a line to <code>server/catalog.ts</code> with the GitHub repo name. Its Vercel or Netlify project, address and pause switch
        are found on their own.
      </p>
    </details>
  );
}
