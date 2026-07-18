import { useEffect, useState } from 'react'
import { api } from '../api'
import { MARITAL_STATUS_LABELS, US_STATES, type MaritalStatus } from '../types'

export function Settings({ householdId }: { householdId: string }) {
  const [name, setName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('Single')
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getHousehold(householdId)
      .then((h) => {
        setName(h.name)
        setStateCode(h.stateCode)
        setMaritalStatus(h.maritalStatus)
        setLoaded(true)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId])

  if (error && !loaded)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!loaded) return <p className="loading">Loading…</p>

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await api.updateHousehold(householdId, { name, stateCode, maritalStatus })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>Plan settings</h1>
          <p className="subtitle">
            Life changes — your plan should keep up. Moving states or a change in marital status
            are the two biggest reasons to revisit your documents.
          </p>
        </div>
      </header>

      <section className="card">
        <form onSubmit={onSubmit} className="inline-form" aria-label="Plan settings">
          <label>
            Plan name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            State of residence
            <select value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              {US_STATES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Marital status
            <select
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value as MaritalStatus)}
            >
              {Object.entries(MARITAL_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Save changes</button>
        </form>
        <p className="hint">
          Changing your state doesn't undo anything — but documents signed under another state's
          law get flagged on your dashboard so you can review and re-sign them.
        </p>
        {saved && (
          <p role="status" className="hint">
            Saved. Check your dashboard for anything that now needs review.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </section>

      <section className="card">
        <h2>When life changes, revisit your plan</h2>
        <ul className="checklist">
          {(
            [
              ['You married or divorced', 'Your will, beneficiary designations, and agents likely all name the wrong (or a missing) person. Update marital status above, then revisit each document.'],
              ['A child was born or adopted', 'Add them under Family. Your will should cover guardianship, and your trust distribution may change.'],
              ['Someone in your plan died', 'Review every role they held — executor, guardian, agent, beneficiary — and name replacements.'],
              ['You moved to another state', 'Update your state above. Signed documents get flagged for review; witnessing and notary rules differ by state.'],
              ['You bought a home or changed jobs', "Add the asset, check its beneficiary or trust titling, and confirm your 401(k) designation didn't reset."],
              ['Three years passed', 'Even with no big event, read your documents. If they still say what you want, you\'re done in ten minutes.'],
            ] as const
          ).map(([label, detail]) => (
            <li key={label} className="todo">
              <span className="check" aria-hidden="true">
                ↻
              </span>
              <div>
                <p className="label">{label}</p>
                <p className="detail">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
