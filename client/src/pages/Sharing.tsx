import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Share, ShareRole } from '../types'

const ROLE_LABELS: Record<ShareRole, string> = {
  Executor: 'Executor — sees everything, read-only',
  FamilyViewer: 'Family viewer — sees everything, read-only',
}

export function Sharing({ householdId }: { householdId: string }) {
  const [shares, setShares] = useState<Share[]>([])
  const [role, setRole] = useState<ShareRole>('Executor')
  const [label, setLabel] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    () =>
      api
        .listShares(householdId)
        .then(setShares)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load')),
    [householdId],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  const inviteLink = (share: Share) => `${window.location.origin}/share/${share.inviteToken}`

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.createShare(householdId, role, label || null)
      setLabel('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invite')
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Share your plan</h1>
          <p className="subtitle">
            Your executor shouldn't discover your plan for the first time when they need it. Invite
            them to see it now — read-only, revocable anytime. They'll need their own free account.
          </p>
        </div>
      </header>

      <section className="card">
        <h2>Create an invite</h2>
        <form onSubmit={create} className="inline-form" aria-label="Create an invite">
          <label>
            Their role
            <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)}>
              {Object.entries(ROLE_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label>
            Who is this for? (optional)
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My brother Dan"
            />
          </label>
          <button type="submit">Create invite link</button>
        </form>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Invites &amp; access ({shares.length})</h2>
        {shares.length === 0 ? (
          <p className="empty">No invites yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>For</th>
                <th>Role</th>
                <th>Status</th>
                <th>Invite link</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {shares.map((s) => (
                <tr key={s.id}>
                  <td>{s.label ?? '—'}</td>
                  <td>{s.role === 'Executor' ? 'Executor' : 'Family viewer'}</td>
                  <td>
                    {s.redeemedAt ? (
                      <span className="badge designated">Accepted{s.sharedWithEmail ? ` — ${s.sharedWithEmail}` : ''}</span>
                    ) : (
                      <span className="badge none">Waiting</span>
                    )}
                  </td>
                  <td>
                    {s.redeemedAt ? (
                      '—'
                    ) : (
                      <button
                        className="link"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inviteLink(s))
                          setCopiedId(s.id)
                          setTimeout(() => setCopiedId(null), 2000)
                        }}
                      >
                        {copiedId === s.id ? 'Copied!' : 'Copy link'}
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      className="link danger"
                      onClick={async () => {
                        await api.revokeShare(householdId, s.id)
                        await reload()
                      }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="hint">
          Revoking removes their access immediately — even after they've accepted.
        </p>
      </section>
    </div>
  )
}
