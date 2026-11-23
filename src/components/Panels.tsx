import type { AppStatus, Extra, SetupItem, Spend, Status } from '../../server/types';
import { ago, glyphBg, initials, platformName, toneClass, usd } from '../lib/format';
import { Icon, PAUSE_ICON, Pill, PLAY_ICON, useArmed } from './ui';

const MONTH = new Date().toLocaleString('en-US', { month: 'short' });

/** Line + area paths for a small chart, in a w×h box. */
function chartPaths(values: number[], w: number, h: number) {
  const max = Math.max(0.01, ...values);
  const pts = values.map((v, i) => `${Math.round((i / Math.max(1, values.length - 1)) * w)} ${Math.round(h - 4 - (v / max) * (h - 12))}`);
  const line = `M${pts.join(' L')}`;
  return { line, area: `${line} L${w} ${h} L0 ${h} Z` };
}

/** Headline + four tiles. */
export function Overview({ status, loading }: { status: Status; loading: boolean }) {
  const apps = status.apps;
  const withSite = apps.filter((a) => a.site);
  const up = withSite.filter((a) => a.site?.ok).length;
  const pausedSites = withSite.filter((a) => a.site?.label === 'Paused').length;
  const down = withSite.length - up - pausedSites;
  const problems = apps.filter((a) => !a.paused && (a.tone === 'bad' || a.tone === 'warn'));
  const targets = apps.filter((a) => a.inPauseAll);
  const paused = apps.filter((a) => a.paused);
  const allPaused = targets.length > 0 && targets.every((a) => a.paused);
  const spend = status.spend;
  const hasSpend = spend.configured && !spend.error;
  const spark = hasSpend && spend.days?.length ? chartPaths(spend.days.map((d) => d.usd), 200, 24) : null;
  const pct = (n: number, of: number) => `${of ? Math.round((n / of) * 100) : 0}%`;

  const headline = allPaused ? 'Everything is paused.' : withSite.length ? `${up} of ${withSite.length} sites are up.` : 'Welcome to Master.';
  const subline = allPaused
    ? `No AI credits, emails or cron from ${targets.length} apps until you resume.`
    : `${status.kill.aiOff ? 'AI is off everywhere · ' : ''}${problems.length ? `${problems.length} need${problems.length === 1 ? 's' : ''} a look` : 'Nothing needs a look'}${hasSpend ? ` · Claude ${usd(spend.monthUsd)} this month` : ''}`;

  return (
    <section className="glass overview" id="overview" aria-label="Overview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="meta">
          <span className="live-dot" aria-hidden /> {loading ? 'Checking…' : `Live · updated ${ago(status.at)}`}
        </span>
        <h2>{headline}</h2>
        <p className="muted">{subline}</p>
      </div>
      <div className="tiles">
        <div className="pane tile">
          <span className="tile-head">
            Sites up <span className={`dot ${down > 0 ? 'bad' : pausedSites ? 'paused' : 'good'}`} aria-hidden />
          </span>
          <span className="tile-value">
            {up}/{withSite.length}
          </span>
          <span className="bar" aria-hidden>
            <span className="good" style={{ width: pct(up, withSite.length) }} />
          </span>
          <span className="small muted ellipsis">
            {[down > 0 ? `${down} not answering` : '', pausedSites ? `${pausedSites} paused` : ''].filter(Boolean).join(' · ') || 'All answering'}
          </span>
        </div>
        <div className="pane tile">
          <span className="tile-head">
            Need a look <span className={`dot ${problems.length ? 'bad' : 'good'}`} aria-hidden />
          </span>
          <span className="tile-value">{problems.length}</span>
          <span className="bar" aria-hidden>
            <span className="bad" style={{ width: pct(problems.length, apps.length) }} />
          </span>
          <span className="small muted ellipsis">{problems.length ? problems.map((p) => p.name).join(', ') : 'Nothing'}</span>
        </div>
        <div className="pane tile">
          <span className="tile-head">
            Paused <span className={`dot ${paused.length ? 'paused' : ''}`} aria-hidden />
          </span>
          <span className="tile-value">{paused.length}</span>
          <span className="bar" aria-hidden>
            <span className="paused" style={{ width: pct(paused.length, Math.max(1, targets.length)) }} />
          </span>
          <span className="small muted ellipsis">{paused.length ? paused.map((p) => p.name).join(', ') : 'Everything running'}</span>
        </div>
        <div className="pane tile">
          <span className="tile-head">
            Claude · {MONTH} <span className="dot" style={{ background: 'var(--accent)' }} aria-hidden />
          </span>
          <span className="tile-value">{hasSpend ? usd(spend.monthUsd) : '—'}</span>
          {spark ? (
            <svg className="spark" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden>
              <path d={spark.line} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="bar" aria-hidden />
          )}
          <span className="small muted ellipsis">{hasSpend ? `Today ${usd(spend.todayUsd)}` : spend.error ? 'Could not load' : 'Add an admin key'}</span>
        </div>
      </div>
    </section>
  );
}

export function SpendCard({ spend }: { spend: Spend }) {
  if (!spend.configured || spend.error)
    return (
      <section className="glass card" aria-label="Claude spend">
        <div className="panel-head">
          <h2>Claude this month</h2>
        </div>
        {spend.error ? (
          <p className="small bad-text">{spend.error}</p>
        ) : (
          <p className="small muted">
            Add <code>ANTHROPIC_ADMIN_KEY</code> to see what all your apps spend on Claude together (Claude Console → Settings → Admin keys;
            organizations only). Until then, check the{' '}
            <a className="link" href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
              Claude Console
            </a>
            .
          </p>
        )}
      </section>
    );
  const c = chartPaths((spend.days ?? []).map((d) => d.usd), 300, 90);
  return (
    <section className="glass card" aria-label="Claude spend">
      <div className="panel-head">
        <h2>Claude this month</h2>
        <span className="small muted">today {usd(spend.todayUsd)}</span>
      </div>
      <span className="big-money">{usd(spend.monthUsd)}</span>
      <svg className="chart" viewBox="0 0 300 90" preserveAspectRatio="none" role="img" aria-label="Claude spend per day, last 14 days">
        <defs>
          <linearGradient id="spend-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.35 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={c.area} fill="url(#spend-area)" />
        <path d={c.line} fill="none" style={{ stroke: 'var(--accent)' }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {spend.top && spend.top.length > 0 && (
        <div className="chips">
          {spend.top.map((t) => (
            <span key={t.name} className="chip">
              {t.name} <b>{usd(t.usd)}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

/** Phone & PC apps: latest release and checks. */
export function DevicesCard({ apps, offset }: { apps: AppStatus[]; offset: number }) {
  return (
    <section className="glass card" aria-label="Phone and PC apps" id="devices">
      <div className="panel-head">
        <h2>Phone &amp; PC</h2>
        <span className="small muted">GitHub releases</span>
      </div>
      <ul className="list">
        {apps.map((a, i) => {
          const rel = a.repoInfo?.release;
          const failing = a.repoInfo?.ci?.tone === 'bad';
          const [tone, label] = failing ? ['bad', 'Checks failing'] : rel ? ['good', rel.tag] : ['muted', 'No release'];
          return (
            <li key={a.id}>
              <a className="list-row" href={rel?.url ?? a.repoInfo?.url ?? '#'} target="_blank" rel="noreferrer">
                <span className="glyph small" style={{ background: glyphBg(offset + i) }} aria-hidden>
                  {initials(a.name)}
                </span>
                <span className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
                  <b style={{ fontWeight: 600 }}>{a.name}</b>
                  <span className="small muted ellipsis">{rel ? `${a.about} · ${ago(rel.at)}` : a.about}</span>
                </span>
                <Pill tone={tone}>{label}</Pill>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SiteTile({ app, onFlip, busy }: { app: AppStatus; onFlip: (pause: boolean) => void; busy: boolean }) {
  const [armed, press] = useArmed();
  const tone = toneClass(app.tone, app.paused);
  const url = app.site?.url ?? app.url ?? app.host?.url;
  const line = app.paused
    ? 'Paused'
    : app.site?.ok
      ? `${platformName(app.host?.platform) ?? 'Site'} · ${app.site.ms} ms`
      : app.site?.label ?? app.summary;
  return (
    <div className="pane site">
      <a className="site-text" href={url ?? app.repoInfo?.url ?? '#'} target="_blank" rel="noreferrer">
        <span className="site-name">
          <span className={`dot ${tone}`} aria-hidden />
          {app.name}
        </span>
        <span className={`small ${tone === 'good' ? 'muted' : `${tone}-text`}`} style={tone === 'paused' ? { color: 'var(--paused)' } : undefined}>
          {line}
        </span>
      </a>
      {app.pausable && !busy && (
        <button
          type="button"
          className={`icon-mini${armed ? ' armed' : ''}`}
          aria-label={armed ? 'Tap again to confirm' : `${app.paused ? 'Resume' : 'Pause'} ${app.name}`}
          title={armed ? 'Tap again' : app.paused ? 'Resume' : 'Pause'}
          onClick={() => press(() => onFlip(!app.paused))}
        >
          <Icon d={app.paused ? PLAY_ICON : PAUSE_ICON} size={13} width={2.4} />
        </button>
      )}
    </div>
  );
}

/** Public websites: up or not. Never in "Pause everything", but Vercel ones can be paused one by one. */
export function SitesCard({ apps, busyId, onFlip }: { apps: AppStatus[]; busyId: string | null; onFlip: (id: string, pause: boolean) => void }) {
  const up = apps.filter((a) => a.site?.ok).length;
  const withSite = apps.filter((a) => a.site).length;
  return (
    <section className="glass card" aria-label="Websites" id="websites">
      <div className="panel-head">
        <h2>Websites</h2>
        <span className={`small ${up < withSite ? 'bad-text' : 'good-text'}`} style={{ fontWeight: 600 }}>
          {up} of {withSite} up
        </span>
      </div>
      <div className="site-grid">
        {apps.map((a) => (
          <SiteTile key={a.id} app={a} busy={busyId === a.id || busyId === 'all'} onFlip={(p) => onFlip(a.id, p)} />
        ))}
      </div>
      <p className="small muted">Never in “Pause everything”, so client sites stay up.</p>
    </section>
  );
}

export function SetupCard({ items }: { items: SetupItem[] }) {
  return (
    <section className="glass card" aria-label="Setup">
      <div className="panel-head">
        <h2>Setup</h2>
        <span className="small muted">
          {items.filter((s) => s.ok).length}/{items.length} keys
        </span>
      </div>
      <p className="small muted">Add these in Vercel → this project → Settings → Environment Variables, then redeploy. The Guide at the bottom says where to get each one.</p>
      <ul className="setup-list">
        {items.map((s) => (
          <li key={s.key}>
            <span className={s.ok ? 'good-text' : 'muted'}>{s.ok ? '✓' : '○'}</span>
            <code>{s.key}</code>
            <span className="small muted">{s.unlocks}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExtrasCard({ extras }: { extras: Extra[] }) {
  return (
    <section className="glass card" aria-label="Also on Vercel and Netlify">
      <div className="panel-head">
        <h2>Also on Vercel / Netlify</h2>
      </div>
      <p className="small muted">Projects not in your list (server/catalog.ts). Old ones can be deleted there to keep things tidy.</p>
      <ul className="list">
        {extras.map((e) => (
          <li key={`${e.platform}:${e.name}`}>
            <div className="list-row" style={{ flexWrap: 'wrap' }}>
              <span className="grow">
                <b style={{ fontWeight: 600 }}>{e.name}</b> <span className="small muted">{e.platform === 'vercel' ? 'Vercel' : 'Netlify'}</span>
              </span>
              {e.paused ? <Pill tone="paused">Paused</Pill> : e.deploy ? <Pill tone={e.deploy.tone}>{e.deploy.label}</Pill> : null}
              {e.deploy?.at && <span className="small muted">{ago(e.deploy.at)}</span>}
              {e.url && (
                <a className="btn" href={e.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              )}
              {e.dashboard && (
                <a className="btn" href={e.dashboard} target="_blank" rel="noreferrer">
                  Settings
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Guide() {
  const here = typeof window !== 'undefined' ? window.location.origin : 'https://your-master-address';
  return (
    <details className="glass card guide" id="guide">
      <summary>
        <h2 style={{ fontSize: 18 }}>Guide</h2>
      </summary>
      <h3>What this page does</h3>
      <p>
        One place for all your apps. Each card shows whether the site answers, the last deploy on Vercel or Netlify, the last code change on
        GitHub, the last automatic check (GitHub Actions) and what runs by itself. Tap any of those boxes to open the page behind it. The
        page refreshes every minute while it’s open. The coloured label says the worst thing going on: red = down or a failed build, amber =
        checks failing or building, purple = paused.
      </p>
      <h3>The pause switch</h3>
      <p>
        <b>Pause everything</b> (tap twice) stops your own apps: Vercel sites are paused (visitors see “paused”, nothing runs, so no AI credits,
        emails or cron), and GitHub workflows that run on a timer are turned off (Trend Videos stops making videos). <b>Resume everything</b>{' '}
        turns it all back on. Each card also has its own Pause button. Websites (some are for clients) and this page are never in “Pause
        everything”. Netlify has no pause switch, so Trading’s scheduled functions keep running: stop those in the app itself.
      </p>
      <h3>The kill switch (connect an app)</h3>
      <p>
        Pausing a Vercel site only works on Vercel, and Netlify can’t be paused at all. The kill switch fixes that: each app asks Master “should I
        stop?” before it calls AI, sends an email or runs a scheduled job, and stops if the answer is yes. Pause, Pause everything and{' '}
        <b>AI off everywhere</b> all use it. An app’s card says <i>Connected</i> once it has asked. If Master can’t be reached, apps carry on as
        normal, so Master being down never takes an app down.
      </p>
      <ol>
        <li>
          In Vercel, open this project → Storage → Upstash Redis → connect it (an existing database is fine). That adds <code>KV_REST_API_URL</code>{' '}
          and <code>KV_REST_API_TOKEN</code>. Redeploy.
        </li>
        <li>
          Each app gets a small file, <code>master-switch</code>, and a one-line check before AI calls and scheduled jobs (already prepared as pull
          requests in your repos). Merge them.
        </li>
        <li>
          If an app can’t find Master, add <code>MASTER_URL</code> = <code>{here}</code> to that app’s settings on Vercel or Netlify and redeploy it.
        </li>
      </ol>
      <h3>Light and dark</h3>
      <p>The moon / sun button at the top switches between light and dark glass on this device. Until you pick, it follows your phone or computer.</p>
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
          <a className="link" href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer">
            Vercel → Account Settings → Tokens
          </a>{' '}
          → Create (scope: Full Account). Projects in a team also need <code>VERCEL_TEAM_ID</code>.
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
        Add a line to <code>server/catalog.ts</code> with the GitHub repo name. Its Vercel or Netlify project, address and pause switch are found
        on their own.
      </p>
    </details>
  );
}
