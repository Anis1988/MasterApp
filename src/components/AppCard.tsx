import type { AppStatus, Tone } from '../../server/types';
import { ago, glyphBg, initials, platformName, toneClass } from '../lib/format';
import { ConfirmButton, Icon, PAUSE_ICON, Pill, PLAY_ICON, Spinner } from './ui';

function Mini({ label, value, tone, href, title, wide }: { label: string; value: string; tone?: Tone | 'paused'; href?: string; title?: string; wide?: boolean }) {
  const body = (
    <>
      <span className="mini-label">{label}</span>
      <span className={`mini-value ${tone && tone !== 'muted' ? tone : ''}`}>{value}</span>
    </>
  );
  const cls = `mini pane${wide ? ' wide' : ''}`;
  return href ? (
    <a className={cls} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer" title={title}>
      {body}
    </a>
  ) : (
    <div className={cls} title={title}>
      {body}
    </div>
  );
}

/** One of your apps, as a glass card. */
export function AppCard({ app, index, owner, busy, onFlip }: { app: AppStatus; index: number; owner: string; busy: boolean; onFlip: (pause: boolean) => void }) {
  const { site, host, repoInfo: repo } = app;
  const deploy = host?.deploy;
  const repoUrl = repo?.url ?? `https://github.com/${owner}/${app.repo}`;
  const url = site?.url ?? app.url ?? host?.url;
  const jobs = repo?.schedules ?? [];
  const pausedSite = site?.label === 'Paused';

  return (
    <article className={`glass app ${app.tone}${app.paused ? ' is-paused' : ''}`}>
      <div className="app-head">
        <span className="glyph" style={{ background: glyphBg(index, app.paused) }} aria-hidden>
          {initials(app.name)}
        </span>
        <div className="grow">
          <h3>
            {app.name}
            {app.self && <span className="tag">this app</span>}
            {repo?.private && <span className="tag">private</span>}
          </h3>
          <p className="small muted ellipsis">{app.about}</p>
        </div>
        <Pill tone={toneClass(app.tone, app.paused)}>{app.summary}</Pill>
      </div>

      <div className="minis">
        {app.group !== 'device' && (
          <Mini
            label="Site"
            value={site ? (site.ok ? `${site.ms} ms` : site.label) : 'No address'}
            tone={pausedSite ? 'paused' : site && !site.ok ? 'bad' : undefined}
            href={url}
          />
        )}
        <Mini
          label={host?.platform === 'github-releases' ? 'Release' : platformName(host?.platform) ?? 'Deploy'}
          value={deploy ? [deploy.label, ago(deploy.at)].filter(Boolean).join(' · ') : host ? '—' : 'Not on Vercel or Netlify'}
          tone={deploy && deploy.tone !== 'good' ? deploy.tone : undefined}
          href={host?.dashboard ?? deploy?.url}
          title={deploy?.message}
        />
        {repo?.commit && <Mini label={`Code · ${ago(repo.commit.at)}`} value={repo.commit.message || 'commit'} href={repo.commit.url} title={repo.commit.message} />}
        {repo?.ci && <Mini label={`Checks · ${repo.ci.name}`} value={[repo.ci.label, ago(repo.ci.at)].filter(Boolean).join(' · ')} tone={repo.ci.tone !== 'good' ? repo.ci.tone : undefined} href={repo.ci.url} />}
        {app.kill && (
          <Mini
            wide
            label={app.kill.seenAt ? `Kill switch · asked ${ago(app.kill.seenAt)}` : 'Kill switch'}
            value={
              app.kill.work
                ? 'Stopped: no AI, no jobs'
                : app.kill.ai
                  ? 'AI off · site and jobs running'
                  : app.kill.seenAt
                    ? 'Connected · running'
                    : 'Not connected yet'
            }
            tone={app.kill.work || app.kill.ai ? 'paused' : app.kill.seenAt ? 'good' : 'warn'}
            href={app.kill.seenAt ? undefined : '#guide'}
          />
        )}
      </div>

      {(jobs.length > 0 || app.runsOnItsOwn || app.ai) && (
        <div className="own">
          {jobs.map((j) => (
            <span key={j.id} className="job">
              {j.name} <Pill tone={j.on ? 'good' : 'paused'}>{j.on ? 'On' : 'Off'}</Pill>
            </span>
          ))}
          {app.runsOnItsOwn && <span>{app.runsOnItsOwn}</span>}
          {app.ai && <span className="muted">AI: {app.ai}</span>}
        </div>
      )}

      {app.notes.length > 0 && (
        <ul className="notes">
          {app.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        {url && (
          <a className="btn solid" href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        )}
        <a className="btn" href={repoUrl} target="_blank" rel="noreferrer">
          Code
        </a>
        {app.pausable &&
          (busy ? (
            <span className="push">
              <Spinner label="Working…" />
            </span>
          ) : app.paused ? (
            <ConfirmButton className="btn go push" confirm="Tap again to resume" onConfirm={() => onFlip(false)}>
              <Icon d={PLAY_ICON} size={14} width={2.4} /> Resume
            </ConfirmButton>
          ) : (
            <ConfirmButton className="btn stop push" confirm="Tap again to pause" onConfirm={() => onFlip(true)}>
              <Icon d={PAUSE_ICON} size={14} width={2.4} /> Pause
            </ConfirmButton>
          ))}
      </div>
    </article>
  );
}
