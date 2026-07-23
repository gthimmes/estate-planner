import { useEffect, useState } from 'react'
import { api, getCurrentHouseholdId, setCurrentHouseholdId } from '../api'
import type { Household } from '../types'

/** Shown only when the account can see more than one plan (own + shared). */
export function PlanSwitcher() {
  const [households, setHouseholds] = useState<Household[]>([])
  const current = getCurrentHouseholdId()

  useEffect(() => {
    api
      .listHouseholds()
      .then(setHouseholds)
      .catch(() => setHouseholds([]))
  }, [])

  if (households.length < 2) return null

  return (
    <label className="plan-switcher">
      Plan
      <select
        aria-label="Switch plan"
        value={current ?? ''}
        onChange={(e) => {
          setCurrentHouseholdId(e.target.value)
          window.location.href = '/'
        }}
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
            {h.accessRole !== 'Owner' ? ' (shared with you)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
