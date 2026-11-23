import type { ActionResult, AppStatus } from '../../server/types';
import type { Target } from '../lib/api';
import { ConfirmButton, Icon, PAUSE_ICON, Pill, PLAY_ICON, Spinner, useArmed } from './ui';

/** The big glass capsule: pauses every app of yours that can be paused (never websites or this dashboard). */
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
  const [armed, press] = useArmed();
  const targets = apps.filter((a) => a.inPauseAll);
  const pausedN = targets.filter((a) => a.paused).length;
  const allPaused = targets.length > 0 && pausedN === targets.length;
  const running = apps.filter((a) => a.group === 'mine' && !a.inPauseAll).map((a) => a.name);

  const [stateTone, stateLabel] = armed
    ? ['bad', 'Armed']
    : allPaused
      ? ['paused', 'On']
      : pausedN
        ? ['paused', `${pausedN} paused`]
        : ['good', 'Off'];

  const capsuleLabel = armed ? (allPaused ? 'Tap again to resume' : 'Tap again to pause') : allPaused ? 'Resume everything' : 'Pause everything';
  const capsuleHint = armed
    ? 'Cancels itself in 5 s'
    : !targets.length
      ? 'Add VERCEL_TOKEN and GITHUB_TOKEN first'
      : allPaused
        ? `${targets.length} apps are paused · tap twice`
        : `Tap twice · ${targets.length - pausedN} app${targets.length - pausedN === 1 ? '' : 's'}`;

  return (
    <section className="glass switch" aria-label="Pause switch">
      <div className="switch-head">
        <h2>Pause switch</h2>
        <Pill tone={stateTone}>{stateLabel}</Pill>
      </div>
      {busy ? (
        <Spinner label="Working…" />
      ) : (
        <button
          type="button"
          className={`capsule${allPaused ? ' go' : ''}${armed ? ' armed' : ''}`}
          disabled={!targets.length}
          onClick={() => press(() => onAct(allPaused ? 'resume' : 'pause', { all: true }))}
        >
          <span className="gloss" aria-hidden />
          <Icon d={allPaused ? PLAY_ICON : PAUSE_ICON} size={28} width={2.4} />
          <span className="capsule-text">
            <b>{capsuleLabel}</b>
            <span>{capsuleHint}</span>
          </span>
        </button>
      )}
      {!busy && pausedN > 0 && !allPaused && (
        <ConfirmButton className="btn go" confirm="Tap again to resume" onConfirm={() => onAct('resume', { all: true })}>
          <Icon d={PLAY_ICON} size={14} width={2.4} /> Resume the {pausedN} paused
        </ConfirmButton>
      )}
      <p className="small" style={{ color: 'var(--ink-2)' }}>
        {targets.length
          ? `Stops ${targets.map((a) => a.name).join(', ')}: Vercel sites go offline and scheduled jobs stop, so no AI credits, emails or cron.`
          : 'Once the tokens are in, this stops your own apps in one go: Vercel sites go offline and scheduled jobs stop.'}
      </p>
      <div className="chips">
        <span className="small muted">Keeps running:</span>
        <span className="chip">Websites</span>
        {running.map((n) => (
          <span key={n} className="chip">
            {n}
          </span>
        ))}
      </div>
      {results && results.length > 0 && (
        <ul className="results">
          {results.map((r) => (
            <li key={r.id} className={r.ok ? 'ok' : 'fail'}>
              <b>{r.ok ? '✓' : '✗'} {r.name}</b> {[...r.did, ...r.errors].join(' · ') || 'nothing to change'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
