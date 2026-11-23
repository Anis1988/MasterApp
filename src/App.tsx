import { useCallback, useEffect, useState } from 'react';
import type { ActionResult, Status } from '../server/types';
import { AppCard } from './components/AppCard';
import { Login } from './components/Login';
import { DevicesCard, ExtrasCard, Guide, Overview, SetupCard, SitesCard, SpendCard } from './components/Panels';
import { PauseAll } from './components/PauseAll';
import { Backdrop, Icon, Spinner } from './components/ui';
import { ApiError, clearCode, fetchStatus, flip, getCode, setCode, type Target } from './lib/api';
import { getTheme, setTheme, type Theme } from './lib/theme';

const REFRESH = 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6';
const SUN = 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4';
const MOON = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';
const LOCK = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4';

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
  const mine = apps.filter((a) => a.group === 'mine');
  const devices = apps.filter((a) => a.group === 'device');
  const sites = apps.filter((a) => a.group === 'sites');
  const isProblem = (a: (typeof apps)[number]) => !a.paused && (a.tone === 'bad' || a.tone === 'warn');
  const mineProblems = mine.filter(isProblem);
  const shownMine = onlyProblems ? mineProblems : mine;
  const missingSetup = status?.setup.some((s) => !s.ok) ?? false;

  return (
    <>
      <Backdrop />
      <div className="page">
        <header className="glass top">
          <div className="brand">
            <span className="orb" aria-hidden />
            <h1>Master</h1>
          </div>
          <nav className="sections" aria-label="Sections">
            <a href="#overview">Overview</a>
            <a href="#apps">Apps</a>
            <a href="#devices">Devices</a>
            <a href="#websites">Websites</a>
          </nav>
          <div className="top-actions">
            <button className="btn icon" onClick={() => void load(true)} disabled={loading} aria-label="Refresh now" title="Refresh now">
              {loading ? <Spinner /> : <Icon d={REFRESH} />}
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
              <Icon d={theme === 'dark' ? SUN : MOON} />
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
              <Icon d={LOCK} />
            </button>
          </div>
        </header>

        {error && (
          <div className="glass card problem" role="alert">
            <p className="bad-text">
              <b>{error instanceof ApiError && error.setup ? 'Setup needed' : 'Something went wrong'}</b>
            </p>
            <p className="small">{error.message}</p>
          </div>
        )}

        {!status && !error && (
          <div className="glass card">
            <Spinner label="Checking every app…" />
          </div>
        )}

        {status && (
          <>
            <div className="hero">
              <Overview status={status} loading={loading} />
              <PauseAll apps={apps} busy={busy === 'all'} results={results} onAct={act} />
            </div>

            {missingSetup && <SetupCard items={status.setup} />}

            {status.errors.length > 0 && (
              <div className="glass card problem">
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

            <section className="section" id="apps" aria-label="My apps">
              <div className="section-head">
                <div className="section-title">
                  <h2>My apps</h2>
                  <span className="small muted">
                    {mine.length} apps · {apps.filter((a) => a.inPauseAll).length} on the switch
                  </span>
                </div>
                <div className="glass segmented" role="group" aria-label="Filter">
                  <button aria-pressed={!onlyProblems} onClick={() => setOnlyProblems(false)}>
                    All apps
                  </button>
                  <button aria-pressed={onlyProblems} onClick={() => setOnlyProblems(true)}>
                    Needs a look · {mineProblems.length}
                  </button>
                </div>
              </div>
              {shownMine.length ? (
                <div className="grid">
                  {shownMine.map((a) => (
                    <AppCard
                      key={a.id}
                      app={a}
                      index={mine.indexOf(a)}
                      owner={status.owner}
                      busy={busy === a.id || busy === 'all'}
                      onFlip={(pause) => void act(pause ? 'pause' : 'resume', { id: a.id })}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass card">
                  <p className="good-text">
                    <b>Nothing needs a look.</b>
                  </p>
                </div>
              )}
            </section>

            <div className="row3">
              <SpendCard spend={status.spend} />
              {devices.length > 0 && <DevicesCard apps={devices} offset={mine.length} />}
              {sites.length > 0 && <SitesCard apps={sites} busyId={busy} onFlip={(id, pause) => void act(pause ? 'pause' : 'resume', { id })} />}
            </div>

            {status.extras.length > 0 && <ExtrasCard extras={status.extras} />}
            {!missingSetup && <SetupCard items={status.setup} />}
            <Guide />
          </>
        )}
      </div>
    </>
  );
}
