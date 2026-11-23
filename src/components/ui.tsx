import { useEffect, useState, type ReactNode } from 'react';
import type { Tone } from '../../server/types';

export function Pill({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Dot({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span className={`status ${tone}`} title={label}>
      <span className="dot" aria-hidden />
      {label}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spin-wrap" role="status">
      <span className="spin" aria-hidden />
      {label}
    </span>
  );
}

/** Tap once: it asks "tap again". Tap again within 5 s: it runs. No pop-up dialogs. */
export function ConfirmButton({
  className,
  children,
  confirm,
  onConfirm,
  disabled,
}: {
  className: string;
  children: ReactNode;
  confirm: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className}${armed ? ' armed' : ''}`}
      disabled={disabled}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirm : children}
    </button>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className="card stat">
      <p className="label">{label}</p>
      <p className={`stat-value ${tone ?? ''}`}>{value}</p>
      {sub && <p className="muted small">{sub}</p>}
    </div>
  );
}
