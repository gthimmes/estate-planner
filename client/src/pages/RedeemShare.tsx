import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, setCurrentHouseholdId } from '../api'

export function RedeemShare() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (!token || attempted.current) return
    attempted.current = true
    api
      .redeemShare(token)
      .then((result) => {
        setCurrentHouseholdId(result.householdId)
        navigate('/', { replace: true })
      })
      .catch((err) =>
        setError(
          err instanceof Error && err.message !== 'Not found'
            ? err.message
            : "This invite link isn't valid anymore. Ask for a fresh one.",
        ),
      )
  }, [token, navigate])

  if (error)
    return (
      <main className="welcome">
        <section className="card">
          <h1>Invite not accepted</h1>
          <p role="alert" className="error">
            {error}
          </p>
        </section>
      </main>
    )
  return <p className="loading app-loading">Accepting the invitation…</p>
}
