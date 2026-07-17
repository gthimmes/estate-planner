import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { getCurrentHouseholdId } from './api'
import { Assets } from './pages/Assets'
import { Dashboard } from './pages/Dashboard'
import { Family } from './pages/Family'
import { Welcome } from './pages/Welcome'

function App() {
  const location = useLocation()
  const householdId = getCurrentHouseholdId()

  if (!householdId && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }

  if (location.pathname === '/welcome') {
    return (
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    )
  }

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <p className="brand">Estate Planner</p>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/family">Family</NavLink>
        <NavLink to="/assets">Assets &amp; debts</NavLink>
        <p className="disclosure">
          Self-help forms and information — not legal advice, and not a substitute for an attorney.
        </p>
      </nav>
      <div className="content">
        <Routes>
          <Route path="/" element={<Dashboard householdId={householdId!} />} />
          <Route path="/family" element={<Family householdId={householdId!} />} />
          <Route path="/assets" element={<Assets householdId={householdId!} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
