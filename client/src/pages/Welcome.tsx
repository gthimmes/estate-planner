import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setCurrentHouseholdId } from '../api'
import { MARITAL_STATUS_LABELS, US_STATES, type MaritalStatus } from '../types'

export function Welcome() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>('Single')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const household = await api.createHousehold({ name, stateCode, maritalStatus })
      setCurrentHouseholdId(household.id)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="welcome">
      <section className="welcome-hero">
        <h1>Plan for the people you love.</h1>
        <p>
          Most people put this off for years. You just need a few minutes to start: tell us who's in
          your life and what you have, and we'll show you exactly what your estate plan needs —
          step by step, in plain language.
        </p>
      </section>
      <form onSubmit={onSubmit} className="card welcome-form" aria-label="Create your household">
        <h2>Let's set up your household</h2>
        <label>
          What should we call your plan?
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Rivera Family"
            required
          />
        </label>
        <label>
          Where do you live?
          <select value={stateCode} onChange={(e) => setStateCode(e.target.value)} required>
            <option value="" disabled>
              Choose your state…
            </option>
            {US_STATES.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <span className="hint">Estate rules differ by state, so this shapes everything.</span>
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
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving}>
          {saving ? 'Setting up…' : 'Start my plan'}
        </button>
        <p className="disclosure">
          Estate Planner provides self-help forms and information, not legal advice, and is not a
          substitute for the advice or services of an attorney.
        </p>
      </form>
    </main>
  )
}
