import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getCurrentHouseholdId, setCurrentHouseholdId } from '../api'
import { MARITAL_STATUS_LABELS, US_STATES, type MaritalStatus } from '../types'

export function Welcome() {
  const navigate = useNavigate()
  const existingPlan = getCurrentHouseholdId()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
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
      const household = await api.createHousehold({
        name: name.trim() || `${firstName}'s estate plan`,
        stateCode,
        maritalStatus,
        self: {
          firstName,
          lastName,
          role: 'Self',
          dateOfBirth: dateOfBirth || null,
        },
      })
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
          Most people put this off for years. You just need a few minutes to start: tell us who you
          are and what you have, and we'll show you exactly what your estate plan needs — step by
          step, in plain language.
        </p>
        {existingPlan && (
          <aside className="banner warning" role="note">
            You already have a plan on this device. <Link to="/">Continue where you left off</Link>{' '}
            — starting over below creates a separate, brand-new plan.
          </aside>
        )}
      </section>
      <form onSubmit={onSubmit} className="card welcome-form" aria-label="Start your plan">
        <h2>First, about you</h2>
        <p className="hint">
          This is your plan — your will, your power of attorney, your wishes. We start with you.
        </p>
        <div className="field-row">
          <label>
            Your first name
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
          <label>
            Your last name
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </label>
        </div>
        <label>
          Your date of birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
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
        <label>
          Name your plan (optional)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={firstName ? `${firstName}'s estate plan` : 'e.g. The Rivera Family'}
          />
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
