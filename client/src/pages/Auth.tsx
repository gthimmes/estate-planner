import { useState } from 'react'
import { api, bootstrapHousehold } from '../api'

export function Auth({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') await api.register(email, password)
      else await api.login(email, password)
      await bootstrapHousehold()
      onAuthed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="welcome">
      <section className="welcome-hero">
        <h1>Plan for the people you love.</h1>
        <p>
          Your estate plan is private by design — it lives behind your own account. Create one to
          start, or sign back in to pick up where you left off.
        </p>
      </section>
      <form onSubmit={onSubmit} className="card welcome-form" aria-label="Sign in or create account">
        <div className="sigpad-tabs" role="tablist" aria-label="Sign in or create account">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Create account
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Sign in
          </button>
        </div>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
          {mode === 'register' && <span className="hint">At least 8 characters.</span>}
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'register' ? 'Create my account' : 'Sign in'}
        </button>
        <p className="disclosure">
          Estate Planner provides self-help forms and information, not legal advice, and is not a
          substitute for the advice or services of an attorney.
        </p>
      </form>
    </main>
  )
}
