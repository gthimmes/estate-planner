import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { api, bootstrapHousehold, getCurrentHouseholdId } from './api'
import { Auth } from './pages/Auth'
import { Assets } from './pages/Assets'
import { Dashboard } from './pages/Dashboard'
import { Family } from './pages/Family'
import { Welcome } from './pages/Welcome'
import { Will } from './pages/Will'
import { WillDocument } from './pages/WillDocument'
import { EstateDocumentPage } from './pages/EstateDocumentPage'
import { ExecutorGuide } from './pages/ExecutorGuide'
import { RedeemShare } from './pages/RedeemShare'
import { Settings } from './pages/Settings'
import { Sharing } from './pages/Sharing'
import { PlanSwitcher } from './components/PlanSwitcher'
import { Trust } from './pages/Trust'
import { Vault } from './pages/Vault'

function App() {
  const location = useLocation()
  const [authState, setAuthState] = useState<'loading' | 'anon' | 'authed'>('loading')
  const householdId = getCurrentHouseholdId()

  useEffect(() => {
    api
      .me()
      .then(async () => {
        await bootstrapHousehold()
        setAuthState('authed')
      })
      .catch(() => setAuthState('anon'))
  }, [])

  if (authState === 'loading') {
    return <p className="loading app-loading">Loading your plan…</p>
  }

  if (authState === 'anon') {
    return <Auth onAuthed={() => setAuthState('authed')} />
  }

  // Redeeming an invite works with or without an existing plan of your own.
  if (location.pathname.startsWith('/share/')) {
    return (
      <Routes>
        <Route path="/share/:token" element={<RedeemShare />} />
      </Routes>
    )
  }

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
        <NavLink to="/will">Your will</NavLink>
        <NavLink to="/poa">Power of attorney</NavLink>
        <NavLink to="/healthcare">Healthcare wishes</NavLink>
        <NavLink to="/living-will">Living will</NavLink>
        <NavLink to="/trust">Living trust</NavLink>
        <NavLink to="/vault">Vault</NavLink>
        <NavLink to="/executor-guide">Executor's guide</NavLink>
        <NavLink to="/sharing">Sharing</NavLink>
        <NavLink to="/settings">Life changes</NavLink>
        <PlanSwitcher />
        <button
          className="link signout"
          onClick={async () => {
            await api.logout().catch(() => undefined)
            window.location.href = '/'
          }}
        >
          Sign out
        </button>
        <p className="disclosure">
          Self-help forms and information — not legal advice, and not a substitute for an attorney.
        </p>
      </nav>
      <div className="content">
        <Routes>
          <Route path="/" element={<Dashboard householdId={householdId!} />} />
          <Route path="/family" element={<Family householdId={householdId!} />} />
          <Route path="/assets" element={<Assets householdId={householdId!} />} />
          <Route path="/will" element={<Will householdId={householdId!} />} />
          <Route path="/will/document" element={<WillDocument householdId={householdId!} />} />
          <Route
            path="/poa"
            element={<EstateDocumentPage key="poa" householdId={householdId!} type="FinancialPoa" />}
          />
          <Route
            path="/healthcare"
            element={
              <EstateDocumentPage key="healthcare" householdId={householdId!} type="HealthcareDirective" />
            }
          />
          <Route
            path="/living-will"
            element={<EstateDocumentPage key="living-will" householdId={householdId!} type="LivingWill" />}
          />
          <Route path="/trust" element={<Trust householdId={householdId!} />} />
          <Route path="/vault" element={<Vault householdId={householdId!} />} />
          <Route path="/executor-guide" element={<ExecutorGuide householdId={householdId!} />} />
          <Route path="/sharing" element={<Sharing householdId={householdId!} />} />
          <Route path="/settings" element={<Settings householdId={householdId!} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default App
