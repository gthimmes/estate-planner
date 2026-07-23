import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, clearCurrentHouseholdId, formatCurrency, NotFoundError } from '../api'
import { ReadinessChecklist } from '../components/ReadinessChecklist'
import { ScoreRing } from '../components/ScoreRing'
import type { Dashboard as DashboardData, Household } from '../types'

export function Dashboard({ householdId }: { householdId: string }) {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getDashboard(householdId), api.getHousehold(householdId)])
      .then(([d, h]) => {
        setDashboard(d)
        setHousehold(h)
      })
      .catch((err) => {
        if (err instanceof NotFoundError) {
          // The stored plan no longer exists on the server — start fresh.
          clearCurrentHouseholdId()
          navigate('/welcome', { replace: true })
          return
        }
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
  }, [householdId, navigate])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!dashboard || !household) return <p className="loading">Loading your plan…</p>

  const nextStep = dashboard.checklist.find((i) => !i.done)
  const stale = dashboard.staleStateDocuments ?? []

  return (
    <div className="dashboard">
      {household.accessRole !== 'Owner' && (
        <aside className="banner warning" role="note">
          You're viewing this plan as{' '}
          <strong>{household.accessRole === 'Executor' ? 'the executor' : 'family'}</strong> — it's
          read-only. The owner can revoke access at any time.
        </aside>
      )}
      {stale.length > 0 && (
        <aside className="banner warning" role="note">
          <strong>You've moved — these documents were signed under another state's law:</strong>
          <ul>
            {stale.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          Rules for witnesses and notarization differ by state. Review each document and sign a
          fresh copy under {household.stateCode} law.
        </aside>
      )}
      <header className="page-header">
        <div>
          <h1>{household.name}</h1>
          <p className="subtitle">Planning under {household.stateCode} law</p>
        </div>
      </header>

      <section className="stats">
        <div className="card stat score-card">
          <ScoreRing score={dashboard.readinessScore} />
          <div>
            <h2>Estate readiness</h2>
            {nextStep ? (
              <p>
                Next up: <strong>{nextStep.label.toLowerCase()}</strong>
              </p>
            ) : (
              <p>Everything on your checklist is done.</p>
            )}
          </div>
        </div>
        <div className="card stat">
          <h2>Net estate</h2>
          <p className="big-number" data-testid="net-estate">
            {formatCurrency(dashboard.netEstate)}
          </p>
          <p className="detail">
            {formatCurrency(dashboard.totalAssets)} in assets −{' '}
            {formatCurrency(dashboard.totalDebts)} in debts
          </p>
          {dashboard.probateExposedValue > 0 && (
            <p className="detail probate-exposure">
              {formatCurrency(dashboard.probateExposedValue)} would go through probate today
            </p>
          )}
        </div>
        <div className="card stat">
          <h2>Your people</h2>
          <p className="big-number">{dashboard.peopleCount}</p>
          <p className="detail">
            {dashboard.hasMinorChildren
              ? 'Includes minor children — your will should name a guardian.'
              : 'Loved ones in your plan.'}
          </p>
          <Link to="/family">Manage family →</Link>
        </div>
      </section>

      {(dashboard.taxNotes?.length ?? 0) > 0 && (
        <section className="card tax-awareness">
          <h2>Estate &amp; inheritance tax awareness</h2>
          <ul>
            {dashboard.taxNotes!.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          <p className="hint">
            Figures verified {dashboard.taxNotesVerifiedOn} and shown for awareness only — thresholds
            change, and this is not tax or legal advice.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Your path to a complete plan</h2>
        <ReadinessChecklist items={dashboard.checklist} />
      </section>
    </div>
  )
}
