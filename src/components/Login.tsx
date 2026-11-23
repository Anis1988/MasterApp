import { useState } from 'react';
import { Backdrop } from './ui';

export function Login({ error, onCode }: { error?: string; onCode: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <>
      <Backdrop />
      <main className="login">
        <form
          className="glass"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) onCode(code.trim());
          }}
        >
          <span className="orb" aria-hidden />
          <h1>Master</h1>
          <p className="small muted">All your apps in one place. Type your access code (APP_ACCESS_TOKEN in Vercel).</p>
          <label htmlFor="code" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Access code
          </label>
          <input
            id="code"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          {error && <p className="small bad-text">{error}</p>}
          <button className="btn solid" type="submit" disabled={!code.trim()}>
            Open
          </button>
        </form>
      </main>
    </>
  );
}
