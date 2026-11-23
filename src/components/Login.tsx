import { useState } from 'react';

export function Login({ error, onCode }: { error?: string; onCode: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <main className="login">
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) onCode(code.trim());
        }}
      >
        <span className="logo big-logo" aria-hidden>
          🛰️
        </span>
        <h1>Master</h1>
        <p className="muted small">All your apps in one place. Type your access code (APP_ACCESS_TOKEN in Vercel).</p>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          placeholder="Access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
        />
        {error && <p className="small bad-text">{error}</p>}
        <button className="btn primary" type="submit" disabled={!code.trim()}>
          Open
        </button>
      </form>
    </main>
  );
}
