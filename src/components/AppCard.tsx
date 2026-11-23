import type { ReactNode } from 'react';
import type { AppStatus } from '../../server/types';
import { ago, platformName, short } from '../lib/format';
import { ConfirmButton, Dot, Pill, Spinner } from './ui';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function AppCard({ app, owner, busy, onFlip }: { app: AppStatus; owner: string; busy: boolean; onFlip: (pause: boolean) => void }) {
  const { site, host, repoInfo: repo } = app;
  const deploy = host?.deploy;
  const repoUrl = repo?.url ?? `https://github.com/${owner}/${app.repo}`;
  const url = site?.url ?? app.url ?? host?.url;
  const jobs = repo?.schedules ?? [];

  return (
    <article className={`card app ${app.tone}${app.paused ? ' is-paused' : ''}`}>
      <header className="app-head">
        <span className="app-icon" aria-hidden>{app.icon}</span>
        <div className="grow">
          <h3>
            {app.name}
            {app.self && <span className="tag">this app</span>}
            {repo?.private && <span className="tag">private</span>}
          </h3>
          <p className="muted small">{app.about}</p>
        </div>
        <Dot tone={app.tone} label={app.summary} />
      </header>

      <dl className="facts">
        {app.group !== 'device' && (
          <Fact label="Site">
            {site ? (
              <>
                <Pill tone={site.tone}>{site.label}</Pill>
                {site.ok && <span className="muted">{site.ms} ms</span>}
              </>
            ) : (
              <span className="muted">No address known</span>
            )}
          </Fact>
        )}
        <Fact label={host?.platform === 'github-releases' ? 'Release' : 'Deploy'}>
          {deploy ? (
            <>
              <span className="muted">{platformName(host?.platform)}</span>
              <Pill tone={deploy.tone}>{deploy.label}</Pill>
              <span className="muted">{ago(deploy.at)}</span>
              {deploy.message && <span className="line muted" title={deploy.message}>{short(deploy.message, 70)}</span>}
            </>
          ) : (
            <span className="muted">{host ? platformName(host.platform) : app.group === 'device' ? 'No release yet' : 'Not found on Vercel or Netlify'}</span>
          )}
        </Fact>
        {repo?.commit && (
          <Fact label="Code">
            <a href={repo.commit.url} target="_blank" rel="noreferrer" className="link" title={repo.commit.message}>
              {short(repo.commit.message || 'commit', 52)}
            </a>
            <span className="muted">{ago(repo.commit.at)}</span>
          </Fact>
        )}
        {repo?.ci && (
          <Fact label="Checks">
            <span className="muted">{short(repo.ci.name, 24)}</span>
            <a href={repo.ci.url} target="_blank" rel="noreferrer">
              <Pill tone={repo.ci.tone}>{repo.ci.label}</Pill>
            </a>
            <span className="muted">{ago(repo.ci.at)}</span>
          </Fact>
        )}
        {(jobs.length > 0 || app.runsOnItsOwn) && (
          <Fact label="On its own">
            {jobs.length > 0
              ? jobs.map((j) => (
                  <span key={j.id} className="job">
                    {j.name} <Pill tone={j.on ? 'good' : 'muted'}>{j.on ? 'On' : 'Off'}</Pill>
                  </span>
                ))
              : null}
            {app.runsOnItsOwn && <span className="line muted">{app.runsOnItsOwn}</span>}
          </Fact>
        )}
        {app.ai && (
          <Fact label="AI">
            <span>{app.ai}</span>
          </Fact>
        )}
      </dl>

      {app.notes.length > 0 && (
        <ul className="notes">
          {app.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <footer className="app-actions">
        {url && (
          <a className="btn small" href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        )}
        <a className="btn small" href={repoUrl} target="_blank" rel="noreferrer">
          Code
        </a>
        {host?.dashboard && (
          <a className="btn small" href={host.dashboard} target="_blank" rel="noreferrer">
            {platformName(host.platform)}
          </a>
        )}
        {app.pausable && (
          <span className="push">
            {busy ? (
              <Spinner label="Working…" />
            ) : app.paused ? (
              <ConfirmButton className="btn small go" confirm="Tap again to resume" onConfirm={() => onFlip(false)}>
                ▶ Resume
              </ConfirmButton>
            ) : (
              <ConfirmButton className="btn small stop" confirm="Tap again to pause" onConfirm={() => onFlip(true)}>
                ⏸ Pause
              </ConfirmButton>
            )}
          </span>
        )}
      </footer>
    </article>
  );
}
