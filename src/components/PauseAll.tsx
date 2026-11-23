import type { ActionResult, AppStatus } from '../../server/types';
import type { Target } from '../lib/api';
import { platformName } from '../lib/format';
import { ConfirmButton, Spinner } from './ui';

/** The big red switch: pauses every app of yours that can be paused (never websites or this dashboard). */
export function PauseAll({
  apps,
  busy,
  results,
  onAct,
}: {
  apps: AppStatus[];
  busy: boolean;
  results: ActionResult[] | null;
  onAct: (action: 'pause' | 'resume', target: Target) => void;
}) {
  const targets = apps.filter((a) => a.inPauseAll);
  const pausedN = targets.filter((a) => a.paused).length;
  const allPaused = targets.length > 0 && pausedN === targets.length;
  const cannot = apps.filter((a) => a.group === 'mine' && !a.self && !a.pausable);

  const title = !targets.length
    ? 'Pause switch'
    : allPaused
      ? 'Everything is paused'
      : pausedN
        ? `${pausedN} of ${targets.length} apps paused`
        : 'Everything is running';

  return (
    <section className={`card pause-all${allPaused ? ' is-paused' : ''}`}>
      <div className="pause-text">
        <h2>{title}</h2>
        {targets.length ? (
          <p className="small">
            Covers <b>{targets.map((a) => a.name).join(', ')}</b>. Vercel sites go offline (no AI calls, emails or cron) and
            scheduled GitHub jobs stop. Websites and this page keep running.
          </p>
        ) : (
          <p className="small">Add VERCEL_TOKEN and GITHUB_TOKEN in Vercel (see Setup below) to turn the switch on.</p>
        )}
        {cannot.length > 0 && (
          <p className="muted small">
            Can’t be paused from here: {cannot.map((a) => `${a.name} (${platformName(a.host?.platform) ?? 'not found'})`).join(', ')}.
          </p>
        )}
      </div>
      <div className="pause-buttons">
        {busy ? (
          <Spinner label="Working…" />
        ) : (
          <>
            {!allPaused && (
              <ConfirmButton
                className="big stop"
                disabled={!targets.length}
                confirm={`Tap again to pause ${targets.length - pausedN} app${targets.length - pausedN === 1 ? '' : 's'}`}
                onConfirm={() => onAct('pause', { all: true })}
              >
                ⏸ Pause everything
              </ConfirmButton>
            )}
            {pausedN > 0 && (
              <ConfirmButton className="big go" confirm="Tap again to resume" onConfirm={() => onAct('resume', { all: true })}>
                ▶ Resume everything
              </ConfirmButton>
            )}
          </>
        )}
      </div>
      {results && results.length > 0 && (
        <ul className="results">
          {results.map((r) => (
            <li key={r.id} className={r.ok ? 'good' : 'bad'}>
              <b>{r.ok ? '✓' : '✗'} {r.name}</b> {[...r.did, ...r.errors].join(' · ') || 'nothing to change'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
