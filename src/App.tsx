import { useCallback, useEffect, useState } from 'react';
import type { ActionResult, AppStatus, Group, Status } from '../server/types';
import { AppCard } from './components/AppCard';
import { Login } from './components/Login';
import { ExtrasCard, Guide, SetupCard, SpendCard } from './components/Panels';
import { PauseAll } from './components/PauseAll';
import { Spinner, Stat } from './components/ui';
import { ApiError, clearCode, fetchStatus, flip, getCode, setCode, type Target } from './lib/api';
import { ago, usd } from './lib/format';
import { getTheme, setTheme, type Theme } from './lib/theme';

const SECTIONS: { group: Group; title: string; sub: string }[] = [
  { group: 'mine', title: 'My apps', sub: 'Your own tools. “Pause everything” covers these.' },
  { group: 'device', title: 'Phone & PC apps', sub: 'Shipped as GitHub releases.' },
  { group: 'sites', title: 'Websites', sub: 'Public sites, some for clients. Never in “Pause everything”.' },
];

export default function App() {
  const [code, setCodeState] = useState(getCode());
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<ActionResult[] | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [, tick] = useState(0);

  const load = useCallback(async (fresh = false) => {
    if (!getCode()) return;
    setLoading(true);
    try {
      setStatus(await fetchStatus(fresh));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearCode();
        setCodeState('');
        setStatus(null);
      }
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (code) void load();
  }, [code, load]);

  // Every minute while the page is open and visible, and when you come back to it.
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) void load();
      tick((n) => n + 1);
    }, 60_000);
    const back = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener('visibilitychange', back);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', back);
    };
  }, [load]);

  const act = async (action: 'pause' | 'resume', target: Target) => {
    setBusy('all' in target ? 'all' : target.id);
    setResults(null);
    try {
      const r = await flip(action, target);
      setResults(r.results);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setBusy(null);
    }
  };

  if (!code)
    return (
      <Login
        error={error?.message}
        onCode={(c) => {
          setCode(c);
          setCodeState(c);
          setError(null);
        }}
      />
    );

  const apps = status?.apps ?? [];
  const withSite = apps.filter((a) => a.site);
  const up = withSite.filter((a) => a.site?.ok).length;
  const problems = apps.filter((a) => a.tone === 'bad' || a.tone === 'warn');
  const paused = apps.filter((a) => a.paused);
  const missingSetup = status?.setup.some((s) => !s.ok) ?? false;
  const shown = (g: Group): AppStatus[] => apps.filter((a) => a.group === g && (!onlyProblems || a.tone === 'bad' || a.tone === 'warn'));

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            🛰️
          </span>
          <div>
            <h1>Master</h1>
            <p className="muted small">{status ? `Updated ${ago(status.at)}` : loading ? 'Loading…' : ' '}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn icon" onClick={() => void load(true)} disabled={loading} aria-label="Refresh now" title="Refresh now">
            {loading ? <Spinner /> : '↻'}
          </button>
          <button
            className="btn icon"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            onClick={() => {
              const t = theme === 'dark' ? 'light' : 'dark';
              setTheme(t);
              setThemeState(t);
            }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            className="btn icon"
            aria-label="Lock (forget the access code on this device)"
            title="Lock"
            onClick={() => {
              clearCode();
              setCodeState('');
              setStatus(null);
            }}
          >
            🔒
          </button>
        </div>
      </header>

      {error && (
        <div className="card problem">
          <p className="bad-text">
            <b>⚠️ {error instanceof ApiError && error.setup ? 'Setup needed' : 'Something went wrong'}</b>
          </p>
          <p className="small">{error.message}</p>
        </div>
      )}

      {!status && !error && (
        <div className="card">
          <Spinner label="Checking every app…" />
        </div>
      )}

      {status && (
        <>
          <PauseAll apps={apps} busy={busy === 'all'} results={results} onAct={act} />

          <div className="stats">
            <Stat label="Sites up" value={`${up}/${withSite.length}`} tone={up < withSite.length ? 'bad' : 'good'} sub={up < withSite.length ? `${withSite.length - up} not answering` : 'all answering'} />
            <Stat label="Need a look" value={problems.length} tone={problems.length ? 'warn' : 'good'} sub={problems.length ? problems.map((p) => p.name).slice(0, 3).join(', ') : 'nothing'} />
            <Stat label="Paused" value={paused.length} sub={paused.length ? paused.map((p) => p.name).slice(0, 3).join(', ') : 'none'} />
            <Stat label="Claude this month" value={status.spend.configured && !status.spend.error ? usd(status.spend.monthUsd) : '—'} sub={status.spend.configured ? (status.spend.error ? 'could not load' : `today ${usd(status.spend.todayUsd)}`) : 'add admin key'} />
          </div>

          {missingSetup && <SetupCard items={status.setup} />}

          {status.errors.length > 0 && (
            <div className="card problem">
              <p className="warn-text">
                <b>Some data couldn’t load</b>
              </p>
              <ul className="small">
                {status.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="filter">
            <button className="chip" aria-pressed={!onlyProblems} onClick={() => setOnlyProblems(false)}>
              All apps
            </button>
            <button className="chip" aria-pressed={onlyProblems} onClick={() => setOnlyProblems(true)}>
              Only problems ({problems.length})
            </button>
          </div>

          {SECTIONS.map((s) => {
            const list = shown(s.group);
            if (!list.length) return null;
            return (
              <section key={s.group} className="section">
                <div className="section-head">
                  <h2>{s.title}</h2>
                  <p className="muted small">{s.sub}</p>
                </div>
                <div className="grid">
                  {list.map((a) => (
                    <AppCard
                      key={a.id}
                      app={a}
                      owner={status.owner}
                      busy={busy === a.id || busy === 'all'}
                      onFlip={(pause) => void act(pause ? 'pause' : 'resume', { id: a.id })}
                    />
                  ))}
                </div>
                {s.group === 'mine' && <SpendCard spend={status.spend} />}
              </section>
            );
          })}

          {status.extras.length > 0 && !onlyProblems && <ExtrasCard extras={status.extras} />}
          {!missingSetup && <SetupCard items={status.setup} />}
          <Guide />
        </>
      )}
    </div>
  );
}
