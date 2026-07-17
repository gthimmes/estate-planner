import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatCurrency } from '../api'
import { ReadinessChecklist } from '../components/ReadinessChecklist'
import { ScoreRing } from '../components/ScoreRing'
import type { Dashboard as DashboardData, Household } from '../types'

export function Dashboard({ householdId }: { householdId: string }) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getDashboard(householdId), api.getHousehold(householdId)])
      .then(([d, h]) => {
        setDashboard(d)
        setHousehold(h)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
  }, [householdId])

  if (error)
    return (
      <p role="alert" className="error">
        {error}
      </p>
    )
  if (!dashboard || !household) return <p className="loading">Loading your plan…</p>

  const nextStep = dashboard.checklist.find((i) => !i.done)

  return (
    <div className="dashboard">
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

      <section className="card">
        <h2>Your path to a complete plan</h2>
        <ReadinessChecklist items={dashboard.checklist} />
      </section>
    </div>
  )
}
