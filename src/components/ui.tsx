import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spin-wrap" role="status">
      <span className="spin" aria-hidden />
      {label}
    </span>
  );
}

/** The colour behind the glass. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="blob b4" />
      <span className="blob b5" />
    </div>
  );
}

export const PAUSE_ICON = 'M9 5v14M15 5v14';
export const PLAY_ICON = 'M8 5l11 7-11 7z';

export function Icon({ d, size = 18, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/** Tap once: it arms for 5 s. Tap again while armed: it runs. No pop-up dialogs. */
export function useArmed(): [boolean, (run: () => void) => void] {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const press = (run: () => void) => {
    clearTimeout(timer.current);
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 5000);
      return;
    }
    setArmed(false);
    run();
  };
  return [armed, press];
}

/** A button that needs two taps. */
export function ConfirmButton({
  className,
  children,
  confirm,
  onConfirm,
  disabled,
  label,
}: {
  className: string;
  children: ReactNode;
  confirm: ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const [armed, press] = useArmed();
  return (
    <button type="button" aria-label={label} className={`${className}${armed ? ' armed' : ''}`} disabled={disabled} onClick={() => press(onConfirm)}>
      {armed ? confirm : children}
    </button>
  );
}
